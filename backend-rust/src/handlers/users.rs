use crate::{
    db::DbPool,
    dto::users::{ProviderParam, UpdateApiKeyRequest, UpdateUserDataRequest},
    error::AppError,
    extractors::{AuthUser, ValidatedJson, ValidatedPath},
    services::{clear_auth_cookie, decrypt, encrypt},
    state::AppState,
};
use axum::{extract::State, response::IntoResponse, Json};
use axum_extra::extract::CookieJar;
use serde_json::json;
use std::time::Duration;

const SUPPORTED_PROVIDERS: &[&str] = &["openai", "gemini", "claude", "mistral", "groq"];

pub async fn get_users(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct UserRow {
        id: i64,
        username: String,
        email: String,
        email_verified: i32,
    }

    let rows: Vec<UserRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, UserRow>(
                "SELECT id, username, email, email_verified FROM users WHERE id = ?",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, UserRow>(
                "SELECT id, username, email, email_verified FROM users WHERE id = $1",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(Json(rows))
}

pub async fn update_api_key(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedJson(body): ValidatedJson<UpdateApiKeyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let provider = body.provider.trim().to_lowercase();

    if !SUPPORTED_PROVIDERS.contains(&provider.as_str()) {
        return Err(AppError::BadRequest("Invalid provider".to_string()));
    }

    if body.api_key.trim().is_empty() {
        return Err(AppError::BadRequest("API key is required".to_string()));
    }

    let salt = state
        .config
        .encryption_salt
        .clone()
        .unwrap_or_else(|| "react-chatgpt-salt".to_string());

    let encrypted = encrypt(&body.api_key, &state.config.encryption_key, &salt)
        .map_err(|e| AppError::Internal(format!("Encryption error: {}", e)))?;

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "INSERT INTO api_keys (user_id, provider, api_key)
                 VALUES (?, ?, ?)
                 ON CONFLICT (user_id, provider) DO UPDATE SET api_key = excluded.api_key",
            )
            .bind(auth.id)
            .bind(&provider)
            .bind(&encrypted)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "INSERT INTO api_keys (user_id, provider, api_key)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, provider) DO UPDATE SET api_key = EXCLUDED.api_key",
            )
            .bind(auth.id)
            .bind(&provider)
            .bind(&encrypted)
            .execute(pool)
            .await?;
        }
    }

    state.api_key_cache.invalidate(auth.id, Some(&provider));

    Ok(Json(json!({ "message": "API Key updated successfully" })))
}

pub async fn update_user_data(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedJson(body): ValidatedJson<UpdateUserDataRequest>,
) -> Result<impl IntoResponse, AppError> {
    let username = body.username.as_deref().map(|s| s.trim().to_string());
    let password = body.password.as_deref().map(|s| s.to_string());

    if username.is_none() && password.is_none() {
        return Ok(Json(json!({ "message": "No changes provided" })));
    }

    // Validate password strength if provided
    if let Some(ref pw) = password {
        let is_strong = pw.len() >= 8
            && pw.chars().any(|c| c.is_ascii_digit())
            && pw.chars().any(|c| c.is_ascii_lowercase())
            && pw.chars().any(|c| c.is_ascii_uppercase());
        if !is_strong {
            return Err(AppError::BadRequest(
                "Password must contain at least one uppercase letter, one lowercase letter, and one number, and be at least 8 characters long".to_string(),
            ));
        }
    }

    // Check username uniqueness
    if let Some(ref uname) = username {
        let exists = match &state.db {
            DbPool::Sqlite(pool) => {
                sqlx::query_as::<_, (String,)>(
                    "SELECT username FROM users WHERE username = ? AND id != ? LIMIT 1",
                )
                .bind(uname)
                .bind(auth.id)
                .fetch_optional(pool)
                .await?
                .is_some()
            }
            DbPool::Postgres(pool) => {
                sqlx::query_as::<_, (String,)>(
                    "SELECT username FROM users WHERE username = $1 AND id != $2 LIMIT 1",
                )
                .bind(uname)
                .bind(auth.id)
                .fetch_optional(pool)
                .await?
                .is_some()
            }
        };

        if exists {
            return Err(AppError::BadRequest("Username already exists".to_string()));
        }
    }

    let hashed_password: Option<String> = if let Some(ref pw) = password {
        Some(
            bcrypt::hash(pw, 10)
                .map_err(|e| AppError::Internal(format!("bcrypt error: {}", e)))?,
        )
    } else {
        None
    };

    match &state.db {
        DbPool::Sqlite(pool) => {
            match (username.as_deref(), hashed_password.as_deref()) {
                (Some(u), Some(p)) => {
                    sqlx::query("UPDATE users SET username = ?, password = ? WHERE id = ?")
                        .bind(u)
                        .bind(p)
                        .bind(auth.id)
                        .execute(pool)
                        .await?;
                }
                (Some(u), None) => {
                    sqlx::query("UPDATE users SET username = ? WHERE id = ?")
                        .bind(u)
                        .bind(auth.id)
                        .execute(pool)
                        .await?;
                }
                (None, Some(p)) => {
                    sqlx::query("UPDATE users SET password = ? WHERE id = ?")
                        .bind(p)
                        .bind(auth.id)
                        .execute(pool)
                        .await?;
                }
                (None, None) => {}
            }
        }
        DbPool::Postgres(pool) => {
            match (username.as_deref(), hashed_password.as_deref()) {
                (Some(u), Some(p)) => {
                    sqlx::query("UPDATE users SET username = $1, password = $2 WHERE id = $3")
                        .bind(u)
                        .bind(p)
                        .bind(auth.id)
                        .execute(pool)
                        .await?;
                }
                (Some(u), None) => {
                    sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
                        .bind(u)
                        .bind(auth.id)
                        .execute(pool)
                        .await?;
                }
                (None, Some(p)) => {
                    sqlx::query("UPDATE users SET password = $1 WHERE id = $2")
                        .bind(p)
                        .bind(auth.id)
                        .execute(pool)
                        .await?;
                }
                (None, None) => {}
            }
        }
    }

    Ok(Json(json!({ "message": "User data updated successfully" })))
}

pub async fn get_api_keys(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow)]
    struct ProviderRow {
        provider: String,
    }

    let rows: Vec<ProviderRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ProviderRow>(
                "SELECT provider FROM api_keys WHERE user_id = ?",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ProviderRow>(
                "SELECT provider FROM api_keys WHERE user_id = $1",
            )
            .bind(auth.id)
            .fetch_all(pool)
            .await?
        }
    };

    let providers: Vec<String> = rows.into_iter().map(|r| r.provider).collect();
    Ok(Json(json!({ "providers": providers })))
}

pub async fn delete_api_key(
    State(state): State<AppState>,
    auth: AuthUser,
    ValidatedPath(params): ValidatedPath<ProviderParam>,
) -> Result<impl IntoResponse, AppError> {
    let provider = params.provider.trim().to_lowercase();

    if !SUPPORTED_PROVIDERS.contains(&provider.as_str()) {
        return Err(AppError::BadRequest("Invalid provider".to_string()));
    }

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query("DELETE FROM api_keys WHERE user_id = ? AND provider = ?")
                .bind(auth.id)
                .bind(&provider)
                .execute(pool)
                .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query("DELETE FROM api_keys WHERE user_id = $1 AND provider = $2")
                .bind(auth.id)
                .bind(&provider)
                .execute(pool)
                .await?;
        }
    }

    state.api_key_cache.invalidate(auth.id, Some(&provider));

    Ok(Json(json!({ "message": "API key deleted successfully" })))
}

pub async fn delete_account(
    State(state): State<AppState>,
    auth: AuthUser,
    jar: CookieJar,
) -> Result<impl IntoResponse, AppError> {
    #[derive(sqlx::FromRow)]
    struct EmailRow {
        email: String,
    }

    let user: Option<EmailRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, EmailRow>("SELECT email FROM users WHERE id = ? LIMIT 1")
                .bind(auth.id)
                .fetch_optional(pool)
                .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, EmailRow>("SELECT email FROM users WHERE id = $1 LIMIT 1")
                .bind(auth.id)
                .fetch_optional(pool)
                .await?
        }
    };

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::NotFound("User not found".to_string())),
    };

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "DELETE FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE user_id = ?)",
            )
            .bind(auth.id)
            .execute(pool)
            .await?;
            sqlx::query("DELETE FROM threads WHERE user_id = ?")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM project_members WHERE user_id = ?")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM projects WHERE user_id = ?")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM api_keys WHERE user_id = ?")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM password_resets WHERE email = ?")
                .bind(&user.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM email_verifications WHERE email = ?")
                .bind(&user.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM users WHERE id = ?")
                .bind(auth.id)
                .execute(pool)
                .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "DELETE FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE user_id = $1)",
            )
            .bind(auth.id)
            .execute(pool)
            .await?;
            sqlx::query("DELETE FROM threads WHERE user_id = $1")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM project_members WHERE user_id = $1")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM projects WHERE user_id = $1")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM api_keys WHERE user_id = $1")
                .bind(auth.id)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM password_resets WHERE email = $1")
                .bind(&user.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM email_verifications WHERE email = $1")
                .bind(&user.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM users WHERE id = $1")
                .bind(auth.id)
                .execute(pool)
                .await?;
        }
    }

    // Invalidate all cached keys
    state.api_key_cache.invalidate(auth.id, None);

    let jar = clear_auth_cookie(jar, &state.config);

    Ok((jar, Json(json!({ "message": "Compte supprimé avec succès." }))))
}

/// Decrypt an API key for a given user + provider (used by chat controller).
pub async fn get_decrypted_api_key(
    state: &AppState,
    user_id: i64,
    provider: &str,
) -> Result<String, AppError> {
    // Try cache first
    if let Some(cached) = state.api_key_cache.get(user_id, provider) {
        return Ok(cached);
    }

    #[derive(sqlx::FromRow)]
    struct ApiKeyRow {
        api_key: String,
    }

    let row: Option<ApiKeyRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ApiKeyRow>(
                "SELECT api_key FROM api_keys WHERE user_id = ? AND provider = ? LIMIT 1",
            )
            .bind(user_id)
            .bind(provider)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ApiKeyRow>(
                "SELECT api_key FROM api_keys WHERE user_id = $1 AND provider = $2 LIMIT 1",
            )
            .bind(user_id)
            .bind(provider)
            .fetch_optional(pool)
            .await?
        }
    };

    let row = match row {
        Some(r) => r,
        None => {
            return Err(AppError::BadRequest(format!(
                "No API key found for provider: {}",
                provider
            )))
        }
    };

    let salt = state
        .config
        .encryption_salt
        .clone()
        .unwrap_or_else(|| "react-chatgpt-salt".to_string());

    let decrypted = decrypt(&row.api_key, &state.config.encryption_key, &salt)
        .map_err(|e| AppError::Internal(format!("Decryption error: {}", e)))?;

    // Cache for 5 minutes
    state
        .api_key_cache
        .set(user_id, provider, decrypted.clone(), Duration::from_secs(300));

    Ok(decrypted)
}
