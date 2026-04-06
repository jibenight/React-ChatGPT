use crate::{
  db::DbPool,
  dto::billing::{ActivateLicenseRequest, CreateCheckoutRequest},
  error::AppError,
  extractors::{AuthUser, ValidatedJson},
  state::AppState,
};
use axum::{
  body::Bytes,
  extract::State,
  http::HeaderMap,
  response::IntoResponse,
  Json,
};
use chrono::Utc;
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;
use stripe::{
  BillingPortalSession, CheckoutSession, CheckoutSessionMode, Client as StripeClient,
  CreateBillingPortalSession, CreateCheckoutSession, CreateCheckoutSessionLineItems,
  CreateCheckoutSessionSubscriptionData, CreateCustomer, Customer, CustomerId, EventObject,
  EventType, Subscription, SubscriptionId, Webhook,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

fn stripe_client(state: &AppState) -> Result<StripeClient, AppError> {
  let key = state
    .config
    .stripe_secret_key
    .as_deref()
    .ok_or_else(|| AppError::Internal("STRIPE_SECRET_KEY not configured".to_string()))?;
  Ok(StripeClient::new(key))
}

fn price_id_for<'a>(
  state: &'a AppState,
  plan: &str,
  interval: &str,
) -> Result<&'a str, AppError> {
  let price = match (plan, interval) {
    ("pro", "monthly") => state.config.stripe_pro_monthly_price_id.as_deref(),
    ("pro", "yearly") => state.config.stripe_pro_yearly_price_id.as_deref(),
    ("team", "monthly") => state.config.stripe_team_monthly_price_id.as_deref(),
    ("team", "yearly") => state.config.stripe_team_yearly_price_id.as_deref(),
    _ => None,
  };
  price.ok_or_else(|| AppError::BadRequest("Price not configured for this plan/interval".to_string()))
}

fn resolve_plan_from_price_id(state: &AppState, price_id: &str) -> String {
  let pro_monthly = state.config.stripe_pro_monthly_price_id.as_deref().unwrap_or("");
  let pro_yearly = state.config.stripe_pro_yearly_price_id.as_deref().unwrap_or("");
  let team_monthly = state.config.stripe_team_monthly_price_id.as_deref().unwrap_or("");
  let team_yearly = state.config.stripe_team_yearly_price_id.as_deref().unwrap_or("");

  if price_id == pro_monthly || price_id == pro_yearly {
    "pro".to_string()
  } else if price_id == team_monthly || price_id == team_yearly {
    "team".to_string()
  } else {
    "free".to_string()
  }
}

async fn get_or_create_stripe_customer(
  state: &AppState,
  client: &StripeClient,
  user_id: i64,
) -> Result<String, AppError> {
  // Check existing customer id
  #[derive(sqlx::FromRow)]
  struct SubRow {
    stripe_customer_id: Option<String>,
  }

  let existing: Option<SubRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, SubRow>(
        "SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?",
      )
      .bind(user_id)
      .fetch_optional(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, SubRow>(
        "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1",
      )
      .bind(user_id)
      .fetch_optional(pool)
      .await?
    }
  };

  if let Some(row) = existing {
    if let Some(cid) = row.stripe_customer_id {
      if !cid.is_empty() {
        return Ok(cid);
      }
    }
  }

  // Fetch user email/username
  #[derive(sqlx::FromRow)]
  struct UserRow {
    email: String,
    username: String,
  }

  let user: Option<UserRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, UserRow>(
        "SELECT email, username FROM users WHERE id = ?",
      )
      .bind(user_id)
      .fetch_optional(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, UserRow>(
        "SELECT email, username FROM users WHERE id = $1",
      )
      .bind(user_id)
      .fetch_optional(pool)
      .await?
    }
  };

  let user = user.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

  let mut metadata = HashMap::new();
  metadata.insert("userId".to_string(), user_id.to_string());

  let mut params = CreateCustomer::new();
  params.email = Some(&user.email);
  params.name = Some(&user.username);
  params.metadata = Some(metadata);

  let customer = Customer::create(client, params)
    .await
    .map_err(|e| AppError::Internal(format!("Stripe customer create error: {}", e)))?;

  let customer_id = customer.id.to_string();

  // Upsert subscription row with the new customer id
  match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query(
        "INSERT INTO subscriptions (user_id, plan_id, stripe_customer_id, status)
         VALUES (?, 'free', ?, 'active')
         ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id",
      )
      .bind(user_id)
      .bind(&customer_id)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      sqlx::query(
        "INSERT INTO subscriptions (user_id, plan_id, stripe_customer_id, status)
         VALUES ($1, 'free', $2, 'active')
         ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id",
      )
      .bind(user_id)
      .bind(&customer_id)
      .execute(pool)
      .await?;
    }
  }

  Ok(customer_id)
}

async fn sync_subscription(
  state: &AppState,
  stripe_sub: &Subscription,
) -> Result<(), AppError> {
  let user_id: i64 = stripe_sub
    .metadata
    .get("userId")
    .and_then(|v| v.parse().ok())
    .ok_or_else(|| AppError::BadRequest("No userId in subscription metadata".to_string()))?;

  let price_id = stripe_sub
    .items
    .data
    .first()
    .and_then(|item| item.price.as_ref())
    .map(|p| p.id.as_str())
    .unwrap_or("");

  let plan_id = resolve_plan_from_price_id(state, price_id);
  let status = stripe_sub.status.as_str().to_string();
  let period_start = chrono::DateTime::<Utc>::from_timestamp(stripe_sub.current_period_start, 0)
    .map(|dt| dt.to_rfc3339())
    .unwrap_or_default();
  let period_end = chrono::DateTime::<Utc>::from_timestamp(stripe_sub.current_period_end, 0)
    .map(|dt| dt.to_rfc3339())
    .unwrap_or_default();
  let cancel_at_period_end: i32 = if stripe_sub.cancel_at_period_end { 1 } else { 0 };
  let sub_id = stripe_sub.id.to_string();

  match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query(
        "INSERT INTO subscriptions
           (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           plan_id = excluded.plan_id,
           stripe_subscription_id = excluded.stripe_subscription_id,
           status = excluded.status,
           current_period_start = excluded.current_period_start,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = CURRENT_TIMESTAMP",
      )
      .bind(user_id)
      .bind(&plan_id)
      .bind(&sub_id)
      .bind(&status)
      .bind(&period_start)
      .bind(&period_end)
      .bind(cancel_at_period_end)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      sqlx::query(
        "INSERT INTO subscriptions
           (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           status = EXCLUDED.status,
           current_period_start = EXCLUDED.current_period_start,
           current_period_end = EXCLUDED.current_period_end,
           cancel_at_period_end = EXCLUDED.cancel_at_period_end,
           updated_at = CURRENT_TIMESTAMP",
      )
      .bind(user_id)
      .bind(&plan_id)
      .bind(&sub_id)
      .bind(&status)
      .bind(&period_start)
      .bind(&period_end)
      .bind(cancel_at_period_end)
      .execute(pool)
      .await?;
    }
  }

  Ok(())
}

// ─── handlers ─────────────────────────────────────────────────────────────────

pub async fn create_checkout_session(
  State(state): State<AppState>,
  auth: AuthUser,
  ValidatedJson(body): ValidatedJson<CreateCheckoutRequest>,
) -> Result<impl IntoResponse, AppError> {
  let client = stripe_client(&state)?;
  let price_id = price_id_for(&state, &body.plan, &body.interval)?.to_string();
  let app_url = state.config.app_url.as_deref().unwrap_or("http://localhost:3000");

  let customer_id_str = get_or_create_stripe_customer(&state, &client, auth.id).await?;
  let customer_id = CustomerId::from_str(&customer_id_str)
    .map_err(|e| AppError::Internal(format!("Invalid customer id: {}", e)))?;

  let success_url = format!("{}/billing/success?session_id={{CHECKOUT_SESSION_ID}}", app_url);
  let cancel_url = format!("{}/pricing", app_url);

  let mut metadata = HashMap::new();
  metadata.insert("userId".to_string(), auth.id.to_string());
  metadata.insert("plan".to_string(), body.plan.clone());
  metadata.insert("interval".to_string(), body.interval.clone());

  let mut sub_metadata = HashMap::new();
  sub_metadata.insert("userId".to_string(), auth.id.to_string());
  sub_metadata.insert("plan".to_string(), body.plan.clone());

  let line_item = CreateCheckoutSessionLineItems {
    price: Some(price_id),
    quantity: Some(1),
    ..Default::default()
  };

  let sub_data = CreateCheckoutSessionSubscriptionData {
    metadata: Some(sub_metadata),
    ..Default::default()
  };

  let mut params = CreateCheckoutSession::new();
  params.customer = Some(customer_id);
  params.mode = Some(CheckoutSessionMode::Subscription);
  params.line_items = Some(vec![line_item]);
  params.success_url = Some(&success_url);
  params.cancel_url = Some(&cancel_url);
  params.metadata = Some(metadata);
  params.subscription_data = Some(sub_data);

  let session = CheckoutSession::create(&client, params)
    .await
    .map_err(|e| AppError::Internal(format!("Stripe checkout create error: {}", e)))?;

  let url = session.url.ok_or_else(|| AppError::Internal("No URL in checkout session".to_string()))?;

  Ok(Json(json!({ "url": url })))
}

pub async fn create_portal_session(
  State(state): State<AppState>,
  auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
  let client = stripe_client(&state)?;
  let app_url = state.config.app_url.as_deref().unwrap_or("http://localhost:3000");

  let customer_id_str = get_or_create_stripe_customer(&state, &client, auth.id).await?;
  let customer_id = CustomerId::from_str(&customer_id_str)
    .map_err(|e| AppError::Internal(format!("Invalid customer id: {}", e)))?;

  let return_url = format!("{}/settings", app_url);

  let mut params = CreateBillingPortalSession::new(customer_id);
  params.return_url = Some(&return_url);

  let session = BillingPortalSession::create(&client, params)
    .await
    .map_err(|e| AppError::Internal(format!("Stripe portal create error: {}", e)))?;

  Ok(Json(json!({ "url": session.url })))
}

pub async fn get_subscription(
  State(state): State<AppState>,
  auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
  let today = Utc::now().format("%Y-%m-%d").to_string();

  #[derive(sqlx::FromRow)]
  struct SubPlanRow {
    plan_id: String,
    status: String,
    current_period_end: Option<String>,
    cancel_at_period_end: i32,
    max_projects: Option<i32>,
    max_threads_per_project: Option<i32>,
    max_messages_per_day: Option<i32>,
    max_providers: Option<i32>,
    collaboration_enabled: i32,
    local_model_limit: Option<i32>,
  }

  #[derive(sqlx::FromRow)]
  struct UsageRow {
    message_count: i32,
  }

  #[derive(sqlx::FromRow)]
  struct CountRow {
    count: i64,
  }

  let sub_opt: Option<SubPlanRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, SubPlanRow>(
        "SELECT s.plan_id, s.status, s.current_period_end, s.cancel_at_period_end,
                p.max_projects, p.max_threads_per_project, p.max_messages_per_day,
                p.max_providers, p.collaboration_enabled, p.local_model_limit
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.user_id = ?",
      )
      .bind(auth.id)
      .fetch_optional(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, SubPlanRow>(
        "SELECT s.plan_id, s.status, s.current_period_end, s.cancel_at_period_end,
                p.max_projects, p.max_threads_per_project, p.max_messages_per_day,
                p.max_providers, p.collaboration_enabled, p.local_model_limit
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.user_id = $1",
      )
      .bind(auth.id)
      .fetch_optional(pool)
      .await?
    }
  };

  let usage_row: Option<UsageRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, UsageRow>(
        "SELECT message_count FROM usage_daily WHERE user_id = ? AND date = ?",
      )
      .bind(auth.id)
      .bind(&today)
      .fetch_optional(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, UsageRow>(
        "SELECT message_count FROM usage_daily WHERE user_id = $1 AND date = $2",
      )
      .bind(auth.id)
      .bind(&today)
      .fetch_optional(pool)
      .await?
    }
  };

  let projects_count: CountRow = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, CountRow>(
        "SELECT COUNT(*) as count FROM projects WHERE user_id = ?",
      )
      .bind(auth.id)
      .fetch_one(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, CountRow>(
        "SELECT COUNT(*) as count FROM projects WHERE user_id = $1",
      )
      .bind(auth.id)
      .fetch_one(pool)
      .await?
    }
  };

  let threads_count: CountRow = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, CountRow>(
        "SELECT COUNT(*) as count FROM threads WHERE user_id = ?",
      )
      .bind(auth.id)
      .fetch_one(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, CountRow>(
        "SELECT COUNT(*) as count FROM threads WHERE user_id = $1",
      )
      .bind(auth.id)
      .fetch_one(pool)
      .await?
    }
  };

  let usage = json!({
    "messages_used_today": usage_row.map(|r| r.message_count).unwrap_or(0),
    "projects_count": projects_count.count,
    "threads_count": threads_count.count,
  });

  match sub_opt {
    None => {
      // No subscription row — return free plan defaults
      #[derive(sqlx::FromRow)]
      struct FreePlanRow {
        max_projects: Option<i32>,
        max_threads_per_project: Option<i32>,
        max_messages_per_day: Option<i32>,
        max_providers: Option<i32>,
        collaboration_enabled: i32,
        local_model_limit: Option<i32>,
      }

      let free_plan: Option<FreePlanRow> = match &state.db {
        DbPool::Sqlite(pool) => {
          sqlx::query_as::<_, FreePlanRow>(
            "SELECT max_projects, max_threads_per_project, max_messages_per_day,
                    max_providers, collaboration_enabled, local_model_limit
             FROM plans WHERE id = 'free'",
          )
          .fetch_optional(pool)
          .await?
        }
        DbPool::Postgres(pool) => {
          sqlx::query_as::<_, FreePlanRow>(
            "SELECT max_projects, max_threads_per_project, max_messages_per_day,
                    max_providers, collaboration_enabled, local_model_limit
             FROM plans WHERE id = 'free'",
          )
          .fetch_optional(pool)
          .await?
        }
      };

      let limits = free_plan.map(|p| json!({
        "max_projects": p.max_projects,
        "max_threads_per_project": p.max_threads_per_project,
        "max_messages_per_day": p.max_messages_per_day,
        "max_providers": p.max_providers,
        "collaboration_enabled": p.collaboration_enabled != 0,
        "local_model_limit": p.local_model_limit,
      })).unwrap_or_else(|| json!({}));

      Ok(Json(json!({
        "plan": "free",
        "status": "active",
        "limits": limits,
        "usage": usage,
      })))
    }
    Some(row) => {
      Ok(Json(json!({
        "plan": row.plan_id,
        "status": row.status,
        "current_period_end": row.current_period_end,
        "cancel_at_period_end": row.cancel_at_period_end != 0,
        "limits": {
          "max_projects": row.max_projects,
          "max_threads_per_project": row.max_threads_per_project,
          "max_messages_per_day": row.max_messages_per_day,
          "max_providers": row.max_providers,
          "collaboration_enabled": row.collaboration_enabled != 0,
          "local_model_limit": row.local_model_limit,
        },
        "usage": usage,
      })))
    }
  }
}

pub async fn handle_webhook(
  State(state): State<AppState>,
  headers: HeaderMap,
  body: Bytes,
) -> Result<impl IntoResponse, AppError> {
  let webhook_secret = state
    .config
    .stripe_webhook_secret
    .as_deref()
    .ok_or_else(|| AppError::BadRequest("Webhook not configured".to_string()))?;

  let sig = headers
    .get("stripe-signature")
    .and_then(|v| v.to_str().ok())
    .ok_or_else(|| AppError::BadRequest("Missing stripe-signature header".to_string()))?;

  let payload = std::str::from_utf8(&body)
    .map_err(|_| AppError::BadRequest("Invalid UTF-8 payload".to_string()))?;

  let event = Webhook::construct_event(payload, sig, webhook_secret)
    .map_err(|e| AppError::BadRequest(format!("Webhook signature verification failed: {}", e)))?;

  let client = stripe_client(&state)?;

  match event.type_ {
    EventType::CheckoutSessionCompleted => {
      if let EventObject::CheckoutSession(session) = event.data.object {
        if session.mode == CheckoutSessionMode::Subscription {
          if let Some(expandable) = session.subscription {
            let sub_id_str = match &expandable {
              stripe::Expandable::Id(id) => id.to_string(),
              stripe::Expandable::Object(sub) => sub.id.to_string(),
            };
            let sub_id = SubscriptionId::from_str(&sub_id_str)
              .map_err(|e| AppError::Internal(format!("Invalid sub id: {}", e)))?;
            let stripe_sub = Subscription::retrieve(&client, &sub_id, &[])
              .await
              .map_err(|e| AppError::Internal(format!("Stripe retrieve sub error: {}", e)))?;
            sync_subscription(&state, &stripe_sub).await?;
          }
        }
      }
    }

    EventType::InvoicePaid => {
      if let EventObject::Invoice(invoice) = event.data.object {
        if let Some(expandable) = invoice.subscription {
          let sub_id_str = match &expandable {
            stripe::Expandable::Id(id) => id.to_string(),
            stripe::Expandable::Object(sub) => sub.id.to_string(),
          };
          let sub_id = SubscriptionId::from_str(&sub_id_str)
            .map_err(|e| AppError::Internal(format!("Invalid sub id: {}", e)))?;
          let stripe_sub = Subscription::retrieve(&client, &sub_id, &[])
            .await
            .map_err(|e| AppError::Internal(format!("Stripe retrieve sub error: {}", e)))?;
          sync_subscription(&state, &stripe_sub).await?;
        }
      }
    }

    EventType::InvoicePaymentFailed => {
      if let EventObject::Invoice(invoice) = event.data.object {
        if let Some(expandable) = invoice.subscription {
          let sub_id_str = match &expandable {
            stripe::Expandable::Id(id) => id.to_string(),
            stripe::Expandable::Object(sub) => sub.id.to_string(),
          };
          match &state.db {
            DbPool::Sqlite(pool) => {
              sqlx::query(
                "UPDATE subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
                 WHERE stripe_subscription_id = ?",
              )
              .bind(&sub_id_str)
              .execute(pool)
              .await?;
            }
            DbPool::Postgres(pool) => {
              sqlx::query(
                "UPDATE subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
                 WHERE stripe_subscription_id = $1",
              )
              .bind(&sub_id_str)
              .execute(pool)
              .await?;
            }
          }
        }
      }
    }

    EventType::CustomerSubscriptionUpdated => {
      if let EventObject::Subscription(stripe_sub) = event.data.object {
        sync_subscription(&state, &stripe_sub).await?;
      }
    }

    EventType::CustomerSubscriptionDeleted => {
      if let EventObject::Subscription(stripe_sub) = event.data.object {
        if let Some(user_id_str) = stripe_sub.metadata.get("userId") {
          if let Ok(user_id) = user_id_str.parse::<i64>() {
            match &state.db {
              DbPool::Sqlite(pool) => {
                sqlx::query(
                  "UPDATE subscriptions SET plan_id = 'free', status = 'active',
                   stripe_subscription_id = NULL, current_period_start = NULL,
                   current_period_end = NULL, cancel_at_period_end = 0,
                   updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                )
                .bind(user_id)
                .execute(pool)
                .await?;
              }
              DbPool::Postgres(pool) => {
                sqlx::query(
                  "UPDATE subscriptions SET plan_id = 'free', status = 'active',
                   stripe_subscription_id = NULL, current_period_start = NULL,
                   current_period_end = NULL, cancel_at_period_end = 0,
                   updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
                )
                .bind(user_id)
                .execute(pool)
                .await?;
              }
            }
          }
        }
      }
    }

    _ => {}
  }

  Ok(Json(json!({ "received": true })))
}

pub async fn activate_license(
  State(state): State<AppState>,
  auth: AuthUser,
  ValidatedJson(body): ValidatedJson<ActivateLicenseRequest>,
) -> Result<impl IntoResponse, AppError> {
  #[derive(sqlx::FromRow)]
  struct LicenseRow {
    id: i64,
    user_id: Option<i64>,
    plan_id: String,
    activated_at: Option<String>,
    expires_at: Option<String>,
  }

  let license: Option<LicenseRow> = match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query_as::<_, LicenseRow>(
        "SELECT id, user_id, plan_id, activated_at, expires_at
         FROM desktop_licenses WHERE license_key = ?",
      )
      .bind(&body.license_key)
      .fetch_optional(pool)
      .await?
    }
    DbPool::Postgres(pool) => {
      sqlx::query_as::<_, LicenseRow>(
        "SELECT id, user_id, plan_id, activated_at, expires_at
         FROM desktop_licenses WHERE license_key = $1",
      )
      .bind(&body.license_key)
      .fetch_optional(pool)
      .await?
    }
  };

  let license = license.ok_or_else(|| AppError::NotFound("License not found".to_string()))?;

  // Check already activated by a different user
  if license.activated_at.is_some() {
    if let Some(existing_user_id) = license.user_id {
      if existing_user_id != auth.id {
        return Err(AppError::BadRequest(
          "License already activated by another account".to_string(),
        ));
      }
    }
  }

  // Check expiry
  if let Some(ref expires_at) = license.expires_at {
    let expiry = chrono::DateTime::parse_from_rfc3339(expires_at)
      .or_else(|_| {
        // Try SQLite datetime format
        chrono::NaiveDateTime::parse_from_str(expires_at, "%Y-%m-%d %H:%M:%S")
          .map(|dt| dt.and_utc().fixed_offset())
      })
      .map_err(|_| AppError::Internal("Invalid expires_at format".to_string()))?;
    if expiry < Utc::now() {
      return Err(AppError::BadRequest("License has expired".to_string()));
    }
  }

  // Activate the license
  match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query(
        "UPDATE desktop_licenses SET user_id = ?, activated_at = CURRENT_TIMESTAMP
         WHERE license_key = ?",
      )
      .bind(auth.id)
      .bind(&body.license_key)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      sqlx::query(
        "UPDATE desktop_licenses SET user_id = $1, activated_at = CURRENT_TIMESTAMP
         WHERE license_key = $2",
      )
      .bind(auth.id)
      .bind(&body.license_key)
      .execute(pool)
      .await?;
    }
  }

  // Upsert subscription
  match &state.db {
    DbPool::Sqlite(pool) => {
      sqlx::query(
        "INSERT INTO subscriptions (user_id, plan_id, status, updated_at)
         VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           plan_id = excluded.plan_id, status = 'active', updated_at = CURRENT_TIMESTAMP",
      )
      .bind(auth.id)
      .bind(&license.plan_id)
      .execute(pool)
      .await?;
    }
    DbPool::Postgres(pool) => {
      sqlx::query(
        "INSERT INTO subscriptions (user_id, plan_id, status, updated_at)
         VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id, status = 'active', updated_at = CURRENT_TIMESTAMP",
      )
      .bind(auth.id)
      .bind(&license.plan_id)
      .execute(pool)
      .await?;
    }
  }

  Ok(Json(json!({ "success": true, "plan": license.plan_id })))
}
