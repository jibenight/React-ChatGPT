use crate::{
    db::DbPool,
    dto::auth::{
        LoginRequest, RegisterRequest, ResendVerificationRequest, ResetPasswordConfirm,
        ResetPasswordRequest, VerifyEmailQuery,
    },
    error::AppError,
    extractors::{ValidatedJson, ValidatedQuery},
    services::{clear_auth_cookie, set_auth_cookie},
    state::AppState,
};
use axum::{
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use axum_extra::extract::CookieJar;
use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize)]
struct Claims {
    id: i64,
    exp: usize,
}

/// Returns datetime string `hours` from now in "YYYY-MM-DD HH:MM:SS" format.
fn future_db_datetime(hours: i64) -> String {
    let dt = Utc::now() + chrono::Duration::hours(hours);
    dt.format("%Y-%m-%d %H:%M:%S").to_string()
}

fn is_strong_password(pw: &str) -> bool {
    pw.len() >= 8
        && pw.chars().any(|c| c.is_ascii_digit())
        && pw.chars().any(|c| c.is_ascii_lowercase())
        && pw.chars().any(|c| c.is_ascii_uppercase())
}

pub async fn cleanup_expired_tokens(db: &DbPool) {
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    match db {
        DbPool::Sqlite(pool) => {
            let _ = sqlx::query("DELETE FROM password_resets WHERE expires_at <= ?")
                .bind(&now)
                .execute(pool)
                .await;
            let _ = sqlx::query("DELETE FROM email_verifications WHERE expires_at <= ?")
                .bind(&now)
                .execute(pool)
                .await;
        }
        DbPool::Postgres(pool) => {
            let _ = sqlx::query("DELETE FROM password_resets WHERE expires_at <= $1")
                .bind(&now)
                .execute(pool)
                .await;
            let _ = sqlx::query("DELETE FROM email_verifications WHERE expires_at <= $1")
                .bind(&now)
                .execute(pool)
                .await;
        }
    }
}

fn make_jwt(user_id: i64, secret: &str) -> Result<String, AppError> {
    let exp = (Utc::now() + chrono::Duration::days(7)).timestamp() as usize;
    let claims = Claims { id: user_id, exp };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encode error: {}", e)))
}

pub async fn register(
    State(state): State<AppState>,
    ValidatedJson(body): ValidatedJson<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    let username = body.username.trim().to_string();
    let password = body.password.clone();

    if !is_strong_password(&password) {
        return Err(AppError::BadRequest("characters".to_string()));
    }

    // Check email uniqueness
    let exists = match &state.db {
        DbPool::Sqlite(pool) => sqlx::query_as::<_, (String,)>(
            "SELECT email FROM users WHERE email = ? LIMIT 1",
        )
        .bind(&email)
        .fetch_optional(pool)
        .await?
        .is_some(),
        DbPool::Postgres(pool) => sqlx::query_as::<_, (String,)>(
            "SELECT email FROM users WHERE email = $1 LIMIT 1",
        )
        .bind(&email)
        .fetch_optional(pool)
        .await?
        .is_some(),
    };

    if exists {
        return Err(AppError::BadRequest("exists".to_string()));
    }

    let hashed = bcrypt::hash(&password, 10)
        .map_err(|e| AppError::Internal(format!("bcrypt error: {}", e)))?;

    cleanup_expired_tokens(&state.db).await;

    // Auto-verify when mailer is disabled (no SMTP configured)
    let auto_verify = !state.mailer.is_enabled();
    let email_verified_val: i32 = if auto_verify { 1 } else { 0 };

    let verify_token = hex::encode(rand::random::<[u8; 32]>());
    let expires_at = future_db_datetime(24);

    let user_id: i64 = match &state.db {
        DbPool::Sqlite(pool) => {
            let result = sqlx::query(
                "INSERT INTO users (username, email, password, email_verified) VALUES (?, ?, ?, ?)",
            )
            .bind(&username)
            .bind(&email)
            .bind(&hashed)
            .bind(email_verified_val)
            .execute(pool)
            .await?;
            let user_id = result.last_insert_rowid();

            if !auto_verify {
                sqlx::query("DELETE FROM email_verifications WHERE email = ?")
                    .bind(&email)
                    .execute(pool)
                    .await?;

                sqlx::query(
                    "INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)",
                )
                .bind(&email)
                .bind(&verify_token)
                .bind(&expires_at)
                .execute(pool)
                .await?;
            }

            user_id
        }
        DbPool::Postgres(pool) => {
            let row: (i64,) = sqlx::query_as(
                "INSERT INTO users (username, email, password, email_verified) VALUES ($1, $2, $3, $4) RETURNING id",
            )
            .bind(&username)
            .bind(&email)
            .bind(&hashed)
            .bind(email_verified_val)
            .fetch_one(pool)
            .await?;
            let user_id = row.0;

            if !auto_verify {
                sqlx::query("DELETE FROM email_verifications WHERE email = $1")
                    .bind(&email)
                    .execute(pool)
                    .await?;

                sqlx::query(
                    "INSERT INTO email_verifications (email, token, expires_at) VALUES ($1, $2, $3)",
                )
                .bind(&email)
                .bind(&verify_token)
                .bind(&expires_at)
                .execute(pool)
                .await?;
            }

            user_id
        }
    };

    if !auto_verify {
        let app_url = state
            .config
            .app_url
            .clone()
            .unwrap_or_else(|| "http://localhost:3000".to_string());

        if let Err(e) = state.mailer.send_verification_email(&email, &verify_token, &app_url).await {
            tracing::error!(error = %e, email = %email, "Failed to send verification email");
        }
    } else {
        tracing::info!(email = %email, "Auto-verified user (mailer disabled)");
    }

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({
            "message": "User registered successfully",
            "userId": user_id,
            "emailVerificationRequired": !auto_verify,
        })),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    ValidatedJson(body): ValidatedJson<LoginRequest>,
) -> Result<Response, AppError> {
    let email = body.email.trim().to_lowercase();
    let password = body.password.clone();

    #[derive(sqlx::FromRow)]
    struct UserRow {
        id: i64,
        username: String,
        email: String,
        password: String,
        email_verified: i32,
    }

    let user: Option<UserRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, UserRow>("SELECT id, username, email, password, email_verified FROM users WHERE email = ? LIMIT 1")
                .bind(&email)
                .fetch_optional(pool)
                .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, UserRow>("SELECT id, username, email, password, email_verified FROM users WHERE email = $1 LIMIT 1")
                .bind(&email)
                .fetch_optional(pool)
                .await?
        }
    };

    let user = match user {
        Some(u) => u,
        None => {
            return Ok((
                axum::http::StatusCode::UNAUTHORIZED,
                jar,
                Json(json!({ "error": "invalid_credentials" })),
            ).into_response())
        }
    };

    let matches = bcrypt::verify(&password, &user.password)
        .map_err(|e| AppError::Internal(format!("bcrypt error: {}", e)))?;

    if !matches {
        return Ok((
            axum::http::StatusCode::UNAUTHORIZED,
            jar,
            Json(json!({ "error": "invalid_credentials" })),
        ).into_response());
    }

    if user.email_verified == 0 {
        return Ok((
            axum::http::StatusCode::FORBIDDEN,
            jar,
            Json(json!({ "error": "email_not_verified" })),
        ).into_response());
    }

    let token = make_jwt(user.id, &state.config.secret_key)?;
    let jar = set_auth_cookie(jar, &token, &state.config);

    Ok((
        jar,
        Json(json!({
            "message": "Login successful",
            "userId": user.id,
            "username": user.username,
            "email": user.email,
            "email_verified": user.email_verified,
        })),
    )
        .into_response())
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<impl IntoResponse, AppError> {
    let jar = clear_auth_cookie(jar, &state.config);
    Ok((jar, Json(json!({ "message": "Logout successful" }))))
}

pub async fn reset_password_request(
    State(state): State<AppState>,
    ValidatedJson(body): ValidatedJson<ResetPasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    cleanup_expired_tokens(&state.db).await;

    #[derive(sqlx::FromRow)]
    struct EmailRow {
        #[allow(dead_code)]
        email: String,
    }

    let user_exists = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, EmailRow>("SELECT email FROM users WHERE email = ? LIMIT 1")
                .bind(&email)
                .fetch_optional(pool)
                .await?
                .is_some()
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, EmailRow>("SELECT email FROM users WHERE email = $1 LIMIT 1")
                .bind(&email)
                .fetch_optional(pool)
                .await?
                .is_some()
        }
    };

    if !user_exists {
        // Return 200 regardless to avoid email enumeration
        return Ok(Json(json!({ "message": "Reset email sent" })));
    }

    let reset_token = hex::encode(rand::random::<[u8; 32]>());
    let expires_at = future_db_datetime(1);

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query(
                "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            )
            .bind(&email)
            .bind(&reset_token)
            .bind(&expires_at)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query(
                "INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)",
            )
            .bind(&email)
            .bind(&reset_token)
            .bind(&expires_at)
            .execute(pool)
            .await?;
        }
    }

    let app_url = state
        .config
        .app_url
        .clone()
        .unwrap_or_else(|| "http://localhost:3000".to_string());

    if let Err(e) = state.mailer.send_reset_email(&email, &reset_token, &app_url).await {
        tracing::error!(error = %e, "Failed to send reset email");
        return Err(AppError::Internal("Internal server error".to_string()));
    }

    Ok(Json(json!({ "message": "Reset email sent" })))
}

pub async fn reset_password(
    State(state): State<AppState>,
    ValidatedJson(body): ValidatedJson<ResetPasswordConfirm>,
) -> Result<impl IntoResponse, AppError> {
    if !is_strong_password(&body.new_password) {
        return Err(AppError::BadRequest(
            "Password must contain at least 8 characters, one uppercase, one lowercase and one number.".to_string(),
        ));
    }

    #[derive(sqlx::FromRow)]
    struct ResetRow {
        email: String,
    }

    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let row: Option<ResetRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, ResetRow>(
                "SELECT email FROM password_resets WHERE token = ? AND expires_at > ?",
            )
            .bind(&body.token)
            .bind(&now)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, ResetRow>(
                "SELECT email FROM password_resets WHERE token = $1 AND expires_at > $2",
            )
            .bind(&body.token)
            .bind(&now)
            .fetch_optional(pool)
            .await?
        }
    };

    let row = match row {
        Some(r) => r,
        None => return Err(AppError::NotFound("Invalid or expired token".to_string())),
    };

    let hashed = bcrypt::hash(&body.new_password, 10)
        .map_err(|e| AppError::Internal(format!("bcrypt error: {}", e)))?;

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query("UPDATE users SET password = ? WHERE email = ?")
                .bind(&hashed)
                .bind(&row.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM password_resets WHERE email = ?")
                .bind(&row.email)
                .execute(pool)
                .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query("UPDATE users SET password = $1 WHERE email = $2")
                .bind(&hashed)
                .bind(&row.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM password_resets WHERE email = $1")
                .bind(&row.email)
                .execute(pool)
                .await?;
        }
    }

    Ok(Json(json!({ "message": "Password reset successfully" })))
}

pub async fn verify_email(
    State(state): State<AppState>,
    jar: CookieJar,
    ValidatedQuery(query): ValidatedQuery<VerifyEmailQuery>,
) -> Result<impl IntoResponse, AppError> {
    cleanup_expired_tokens(&state.db).await;

    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    #[derive(sqlx::FromRow)]
    struct VerifyRow {
        email: String,
    }

    let row: Option<VerifyRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, VerifyRow>(
                "SELECT email FROM email_verifications WHERE token = ? AND expires_at > ?",
            )
            .bind(&query.token)
            .bind(&now)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, VerifyRow>(
                "SELECT email FROM email_verifications WHERE token = $1 AND expires_at > $2",
            )
            .bind(&query.token)
            .bind(&now)
            .fetch_optional(pool)
            .await?
        }
    };

    let row = match row {
        Some(r) => r,
        None => return Err(AppError::NotFound("Invalid or expired token".to_string())),
    };

    #[derive(sqlx::FromRow)]
    struct UserRow {
        id: i64,
        username: String,
        email: String,
    }

    let user: Option<UserRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query("UPDATE users SET email_verified = 1 WHERE email = ?")
                .bind(&row.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM email_verifications WHERE token = ?")
                .bind(&query.token)
                .execute(pool)
                .await?;
            sqlx::query_as::<_, UserRow>(
                "SELECT id, username, email FROM users WHERE email = ?",
            )
            .bind(&row.email)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query("UPDATE users SET email_verified = 1 WHERE email = $1")
                .bind(&row.email)
                .execute(pool)
                .await?;
            sqlx::query("DELETE FROM email_verifications WHERE token = $1")
                .bind(&query.token)
                .execute(pool)
                .await?;
            sqlx::query_as::<_, UserRow>(
                "SELECT id, username, email FROM users WHERE email = $1",
            )
            .bind(&row.email)
            .fetch_optional(pool)
            .await?
        }
    };

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::NotFound("User not found".to_string())),
    };

    let token = make_jwt(user.id, &state.config.secret_key)?;
    let jar = set_auth_cookie(jar, &token, &state.config);

    Ok((
        jar,
        Json(json!({
            "message": "Email verified successfully",
            "userId": user.id,
            "username": user.username,
            "email": user.email,
        })),
    ))
}

pub async fn resend_verification(
    State(state): State<AppState>,
    ValidatedJson(body): ValidatedJson<ResendVerificationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    cleanup_expired_tokens(&state.db).await;

    #[derive(sqlx::FromRow)]
    struct UserRow {
        email_verified: i32,
    }

    let user: Option<UserRow> = match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query_as::<_, UserRow>(
                "SELECT email_verified FROM users WHERE email = ? LIMIT 1",
            )
            .bind(&email)
            .fetch_optional(pool)
            .await?
        }
        DbPool::Postgres(pool) => {
            sqlx::query_as::<_, UserRow>(
                "SELECT email_verified FROM users WHERE email = $1 LIMIT 1",
            )
            .bind(&email)
            .fetch_optional(pool)
            .await?
        }
    };

    // Return 200 regardless if user doesn't exist or is already verified
    match user {
        None => return Ok(Json(json!({ "message": "Verification email sent" }))),
        Some(u) if u.email_verified != 0 => {
            return Ok(Json(json!({ "message": "Verification email sent" })))
        }
        _ => {}
    }

    let verify_token = hex::encode(rand::random::<[u8; 32]>());
    let expires_at = future_db_datetime(24);

    match &state.db {
        DbPool::Sqlite(pool) => {
            sqlx::query("DELETE FROM email_verifications WHERE email = ?")
                .bind(&email)
                .execute(pool)
                .await?;
            sqlx::query(
                "INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)",
            )
            .bind(&email)
            .bind(&verify_token)
            .bind(&expires_at)
            .execute(pool)
            .await?;
        }
        DbPool::Postgres(pool) => {
            sqlx::query("DELETE FROM email_verifications WHERE email = $1")
                .bind(&email)
                .execute(pool)
                .await?;
            sqlx::query(
                "INSERT INTO email_verifications (email, token, expires_at) VALUES ($1, $2, $3)",
            )
            .bind(&email)
            .bind(&verify_token)
            .bind(&expires_at)
            .execute(pool)
            .await?;
        }
    }

    let app_url = state
        .config
        .app_url
        .clone()
        .unwrap_or_else(|| "http://localhost:3000".to_string());

    if let Err(e) = state.mailer.send_verification_email(&email, &verify_token, &app_url).await {
        tracing::error!(error = %e, "Failed to send verification email");
        return Err(AppError::Internal("Internal server error".to_string()));
    }

    Ok(Json(json!({ "message": "Verification email sent" })))
}
