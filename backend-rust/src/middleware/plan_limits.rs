use crate::db::DbPool;
use crate::error::AppError;
use crate::extractors::AuthUser;

fn plan_limit_exceeded(
    feature: &str,
    current: i32,
    allowed: Option<i32>,
    plan_id: &str,
) -> AppError {
    AppError::PlanLimitExceeded {
        error: format!("{} limit exceeded", feature),
        limit: allowed,
        current,
        allowed,
        plan: plan_id.to_string(),
        upgrade_url: "/pricing".to_string(),
    }
}

/// Enforce plan limits for a given feature.
///
/// Features: `"message"`, `"project"`, `"thread"`, `"provider"`, `"collaboration"`.
/// For `"thread"`, `project_id` must be provided.
pub async fn enforce_plan_limits(
    db: &DbPool,
    user: &AuthUser,
    feature: &str,
    project_id: Option<i64>,
) -> Result<(), AppError> {
    let plan = match &user.plan {
        Some(p) => p,
        // No subscription row means free plan defaults apply
        None => return enforce_free_defaults(db, user.id, feature, project_id).await,
    };

    let plan_id = plan.plan_id.as_str();

    match feature {
        "message" => {
            let limit = match plan.max_messages_per_day {
                None => return Ok(()), // unlimited
                Some(l) => l,
            };
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
            let current = fetch_message_count(db, user.id, &today).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), plan_id));
            }
        }
        "project" => {
            let limit = match plan.max_projects {
                None => return Ok(()),
                Some(l) => l,
            };
            let current = fetch_project_count(db, user.id).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), plan_id));
            }
        }
        "thread" => {
            let limit = match plan.max_threads_per_project {
                None => return Ok(()),
                Some(l) => l,
            };
            let pid = match project_id {
                Some(id) => id,
                None => return Ok(()),
            };
            let current = fetch_thread_count(db, pid, user.id).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), plan_id));
            }
        }
        "provider" => {
            let limit = match plan.max_providers {
                None => return Ok(()),
                Some(l) => l,
            };
            let current = fetch_provider_count(db, user.id).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), plan_id));
            }
        }
        "collaboration" => {
            if !plan.collaboration_enabled {
                return Err(plan_limit_exceeded(feature, 1, Some(0), plan_id));
            }
        }
        _ => {}
    }

    Ok(())
}

/// Fallback enforcement when no subscription row exists (treat as free plan).
async fn enforce_free_defaults(
    db: &DbPool,
    user_id: i64,
    feature: &str,
    project_id: Option<i64>,
) -> Result<(), AppError> {
    const FREE_PLAN_ID: &str = "free";

    match feature {
        "message" => {
            let limit = 50i32;
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
            let current = fetch_message_count(db, user_id, &today).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), FREE_PLAN_ID));
            }
        }
        "project" => {
            let limit = 3i32;
            let current = fetch_project_count(db, user_id).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), FREE_PLAN_ID));
            }
        }
        "thread" => {
            let limit = 5i32;
            let pid = match project_id {
                Some(id) => id,
                None => return Ok(()),
            };
            let current = fetch_thread_count(db, pid, user_id).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), FREE_PLAN_ID));
            }
        }
        "provider" => {
            let limit = 1i32;
            let current = fetch_provider_count(db, user_id).await?;
            if current >= limit {
                return Err(plan_limit_exceeded(feature, current, Some(limit), FREE_PLAN_ID));
            }
        }
        "collaboration" => {
            return Err(plan_limit_exceeded(feature, 1, Some(0), FREE_PLAN_ID));
        }
        _ => {}
    }

    Ok(())
}

async fn fetch_message_count(db: &DbPool, user_id: i64, today: &str) -> Result<i32, AppError> {
    match db {
        DbPool::Sqlite(pool) => {
            let row: Option<(i32,)> = sqlx::query_as(
                "SELECT message_count FROM usage_daily WHERE user_id = ? AND date = ?",
            )
            .bind(user_id)
            .bind(today)
            .fetch_optional(pool)
            .await?;
            Ok(row.map(|r| r.0).unwrap_or(0))
        }
        DbPool::Postgres(pool) => {
            let row: Option<(i32,)> = sqlx::query_as(
                "SELECT message_count FROM usage_daily WHERE user_id = $1 AND date = $2",
            )
            .bind(user_id)
            .bind(today)
            .fetch_optional(pool)
            .await?;
            Ok(row.map(|r| r.0).unwrap_or(0))
        }
    }
}

async fn fetch_project_count(db: &DbPool, user_id: i64) -> Result<i32, AppError> {
    match db {
        DbPool::Sqlite(pool) => {
            let row: (i32,) = sqlx::query_as(
                "SELECT COUNT(*) FROM projects WHERE user_id = ?",
            )
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(row.0)
        }
        DbPool::Postgres(pool) => {
            let row: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM projects WHERE user_id = $1",
            )
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(row.0 as i32)
        }
    }
}

async fn fetch_thread_count(db: &DbPool, project_id: i64, user_id: i64) -> Result<i32, AppError> {
    match db {
        DbPool::Sqlite(pool) => {
            let row: (i32,) = sqlx::query_as(
                "SELECT COUNT(*) FROM threads WHERE project_id = ? AND user_id = ?",
            )
            .bind(project_id)
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(row.0)
        }
        DbPool::Postgres(pool) => {
            let row: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM threads WHERE project_id = $1 AND user_id = $2",
            )
            .bind(project_id)
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(row.0 as i32)
        }
    }
}

async fn fetch_provider_count(db: &DbPool, user_id: i64) -> Result<i32, AppError> {
    match db {
        DbPool::Sqlite(pool) => {
            let row: (i32,) = sqlx::query_as(
                "SELECT COUNT(DISTINCT provider) FROM api_keys WHERE user_id = ?",
            )
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(row.0)
        }
        DbPool::Postgres(pool) => {
            let row: (i64,) = sqlx::query_as(
                "SELECT COUNT(DISTINCT provider) FROM api_keys WHERE user_id = $1",
            )
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(row.0 as i32)
        }
    }
}
