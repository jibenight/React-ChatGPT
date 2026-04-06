use crate::{
    error::AppError,
    extractors::{AuthUser, PlanData},
    state::AppState,
};
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use axum_extra::extract::CookieJar;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    /// User ID stored in the `id` field (matching Node.js JWT payload).
    id: i64,
    exp: usize,
}

const LOCALHOST_IPS: &[&str] = &["127.0.0.1", "::1", "::ffff:127.0.0.1"];

fn is_localhost(addr: &str) -> bool {
    LOCALHOST_IPS.contains(&addr)
}

/// Query row returned from the subscription + plan JOIN.
#[derive(sqlx::FromRow)]
struct PlanRow {
    plan_id: String,
    max_projects: Option<i32>,
    max_threads_per_project: Option<i32>,
    max_messages_per_day: Option<i32>,
    max_providers: Option<i32>,
    collaboration_enabled: i32,
}

async fn fetch_plan(state: &AppState, user_id: i64) -> Option<PlanData> {
    let sql = r#"
        SELECT s.plan_id, p.max_projects, p.max_threads_per_project,
               p.max_messages_per_day, p.max_providers, p.collaboration_enabled
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = ? AND s.status = 'active'
        LIMIT 1
    "#;

    match &state.db {
        crate::db::DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, PlanRow>(sql)
                .bind(user_id)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten()
                .map(|r| PlanData {
                    plan_id: r.plan_id,
                    max_projects: r.max_projects,
                    max_threads_per_project: r.max_threads_per_project,
                    max_messages_per_day: r.max_messages_per_day,
                    max_providers: r.max_providers,
                    collaboration_enabled: r.collaboration_enabled != 0,
                })
        }
        crate::db::DbPool::Postgres(pool) => {
            let pg_sql = sql.replace('?', "$1");
            sqlx::query_as::<_, PlanRow>(&pg_sql)
                .bind(user_id)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten()
                .map(|r| PlanData {
                    plan_id: r.plan_id,
                    max_projects: r.max_projects,
                    max_threads_per_project: r.max_threads_per_project,
                    max_messages_per_day: r.max_messages_per_day,
                    max_providers: r.max_providers,
                    collaboration_enabled: r.collaboration_enabled != 0,
                })
        }
    }
}

async fn ensure_dev_user(state: &AppState, email: &str, username: &str) -> Option<i64> {
    let sql_select = "SELECT id FROM users WHERE email = ? LIMIT 1";
    let sql_insert = "INSERT OR IGNORE INTO users (username, email, password, email_verified) VALUES (?, ?, ?, 1)";

    match &state.db {
        crate::db::DbPool::Sqlite(pool) => {
            // Try to find existing user.
            if let Ok(Some(row)) = sqlx::query_as::<_, (i64,)>(sql_select)
                .bind(email)
                .fetch_optional(pool)
                .await
            {
                return Some(row.0);
            }
            // Create if absent.
            let random_pw = uuid::Uuid::new_v4().to_string();
            let hashed = bcrypt::hash(&random_pw, 10).ok()?;
            sqlx::query(sql_insert)
                .bind(username)
                .bind(email)
                .bind(&hashed)
                .execute(pool)
                .await
                .ok()?;
            // Re-fetch id (INSERT OR IGNORE may silently skip if race).
            sqlx::query_as::<_, (i64,)>(sql_select)
                .bind(email)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten()
                .map(|r| r.0)
        }
        crate::db::DbPool::Postgres(pool) => {
            let pg_select = "SELECT id FROM users WHERE email = $1 LIMIT 1";
            let pg_insert = "INSERT INTO users (username, email, password, email_verified) VALUES ($1, $2, $3, 1) ON CONFLICT (email) DO NOTHING";
            if let Ok(Some(row)) = sqlx::query_as::<_, (i64,)>(pg_select)
                .bind(email)
                .fetch_optional(pool)
                .await
            {
                return Some(row.0);
            }
            let random_pw = uuid::Uuid::new_v4().to_string();
            let hashed = bcrypt::hash(&random_pw, 10).ok()?;
            sqlx::query(pg_insert)
                .bind(username)
                .bind(email)
                .bind(&hashed)
                .execute(pool)
                .await
                .ok()?;
            sqlx::query_as::<_, (i64,)>(pg_select)
                .bind(email)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten()
                .map(|r| r.0)
        }
    }
}

async fn verify_user_exists(state: &AppState, user_id: i64) -> bool {
    let sql = "SELECT id FROM users WHERE id = ? LIMIT 1";
    match &state.db {
        crate::db::DbPool::Sqlite(pool) => sqlx::query_as::<_, (i64,)>(sql)
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten()
            .is_some(),
        crate::db::DbPool::Postgres(pool) => {
            let pg_sql = "SELECT id FROM users WHERE id = $1 LIMIT 1";
            sqlx::query_as::<_, (i64,)>(pg_sql)
                .bind(user_id)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten()
                .is_some()
        }
    }
}

/// Tower middleware function.
///
/// 1. If `DEV_BYPASS_AUTH` is set and the request comes from localhost, auto-create
///    a dev user from `X-Dev-User-Email` / `X-Dev-User-Name` headers.
/// 2. Otherwise, validate the JWT from the auth cookie and load the user's plan.
/// 3. Insert an `AuthUser` into request extensions for downstream handlers.
pub async fn require_auth(
    State(state): State<AppState>,
    jar: CookieJar,
    mut req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, AppError> {
    // ------------------------------------------------------------------
    // Dev bypass (localhost only)
    // ------------------------------------------------------------------
    if state.config.dev_bypass_auth && state.config.node_env != "production" {
        let remote_ip = req
            .extensions()
            .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
            .map(|ci| ci.0.ip().to_string())
            .unwrap_or_default();

        if !is_localhost(&remote_ip) {
            return Ok((
                StatusCode::FORBIDDEN,
                axum::Json(serde_json::json!({
                    "error": "Dev bypass only allowed from localhost"
                })),
            )
                .into_response());
        }

        let header_email = req
            .headers()
            .get("x-dev-user-email")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("dev@local")
            .to_lowercase();
        let header_name = req
            .headers()
            .get("x-dev-user-name")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("Dev User")
            .to_string();

        let user_id = ensure_dev_user(&state, &header_email, &header_name)
            .await
            .ok_or_else(|| AppError::Internal("Failed to create dev user".into()))?;

        let plan = fetch_plan(&state, user_id).await;
        req.extensions_mut().insert(AuthUser {
            id: user_id,
            is_dev: true,
            plan,
        });
        return Ok(next.run(req).await);
    }

    // ------------------------------------------------------------------
    // Normal JWT auth
    // ------------------------------------------------------------------
    let token = jar
        .get(&state.config.auth_cookie_name)
        .map(|c| c.value().to_owned());

    let token = match token {
        Some(t) if !t.is_empty() => t,
        _ => return Err(AppError::Unauthorized),
    };

    let decoding_key = DecodingKey::from_secret(state.config.secret_key.as_bytes());
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let claims = decode::<Claims>(&token, &decoding_key, &validation)
        .map_err(|_| AppError::Unauthorized)?
        .claims;

    if !verify_user_exists(&state, claims.id).await {
        return Err(AppError::Unauthorized);
    }

    let plan = fetch_plan(&state, claims.id).await;
    req.extensions_mut().insert(AuthUser {
        id: claims.id,
        is_dev: false,
        plan,
    });

    Ok(next.run(req).await)
}
