use crate::{
  db::DbPool,
  error::AppError,
  services::set_auth_cookie,
  state::AppState,
};
use axum::{
  extract::{Form, Query, State},
  response::{IntoResponse, Redirect, Response},
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use oauth2::{
  AuthUrl, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge, PkceCodeVerifier,
  RedirectUrl, Scope, TokenUrl,
  basic::BasicClient,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::Duration;

// ─── Cookie names ─────────────────────────────────────────────────────────────

const OAUTH_STATE_COOKIE: &str = "__oauth_state";
const OAUTH_VERIFIER_COOKIE: &str = "__oauth_verifier";
const OAUTH_STATE_MAX_AGE_SECS: i64 = 600; // 10 minutes

// ─── Param structs ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct OAuthCallbackParams {
  pub code: Option<String>,
  pub state: Option<String>,
  pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct AppleCallbackParams {
  pub code: Option<String>,
  pub state: Option<String>,
  pub id_token: Option<String>,
  pub user: Option<String>,
  pub error: Option<String>,
}

// ─── JWT Claims ───────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
struct Claims {
  id: i64,
  exp: usize,
}

pub(crate) fn make_jwt(user_id: i64, secret: &str) -> Result<String, AppError> {
  let exp = (Utc::now() + chrono::Duration::days(7)).timestamp() as usize;
  let claims = Claims { id: user_id, exp };
  encode(
    &Header::new(Algorithm::HS256),
    &claims,
    &EncodingKey::from_secret(secret.as_bytes()),
  )
  .map_err(|e| AppError::Internal(format!("JWT encode error: {}", e)))
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

fn frontend_url(config: &crate::config::AppConfig) -> String {
  config
    .app_url
    .clone()
    .unwrap_or_else(|| "http://localhost:5173".to_string())
    .trim_end_matches('/')
    .to_string()
}

fn backend_base(config: &crate::config::AppConfig) -> String {
  config
    .oauth_redirect_base_url
    .trim_end_matches('/')
    .to_string()
}

fn oauth_success_redirect(
  jar: CookieJar,
  user_id: i64,
  state: &AppState,
) -> Result<(CookieJar, Redirect), AppError> {
  let token = make_jwt(user_id, &state.config.secret_key)?;
  let jar = set_auth_cookie(jar, &token, &state.config);
  let url = format!("{}/chat", frontend_url(&state.config));
  Ok((jar, Redirect::to(&url)))
}

fn oauth_error_redirect(config: &crate::config::AppConfig, error_code: &str) -> Redirect {
  let url = format!("{}/login?error={}", frontend_url(config), error_code);
  Redirect::to(&url)
}

// ─── OAuth cookies ────────────────────────────────────────────────────────────

fn build_state_cookie(value: String) -> Cookie<'static> {
  Cookie::build((OAUTH_STATE_COOKIE, value))
    .http_only(false)
    .same_site(SameSite::Lax)
    .path("/")
    .max_age(Duration::seconds(OAUTH_STATE_MAX_AGE_SECS))
    .build()
}

fn build_verifier_cookie(value: String) -> Cookie<'static> {
  Cookie::build((OAUTH_VERIFIER_COOKIE, value))
    .http_only(true)
    .same_site(SameSite::Lax)
    .path("/")
    .max_age(Duration::seconds(OAUTH_STATE_MAX_AGE_SECS))
    .build()
}

fn clear_oauth_cookies(jar: CookieJar) -> CookieJar {
  let s = Cookie::build((OAUTH_STATE_COOKIE, ""))
    .path("/")
    .max_age(Duration::seconds(0))
    .build();
  let v = Cookie::build((OAUTH_VERIFIER_COOKIE, ""))
    .path("/")
    .max_age(Duration::seconds(0))
    .build();
  jar.remove(s).remove(v)
}

// ─── CSRF state check ─────────────────────────────────────────────────────────

fn check_state(jar: &CookieJar, param_state: Option<&String>) -> bool {
  let cookie_val = match jar.get(OAUTH_STATE_COOKIE) {
    Some(c) if !c.value().is_empty() => c.value().to_string(),
    _ => return false,
  };
  match param_state {
    Some(s) => &cookie_val == s,
    None => false,
  }
}

// ─── find_or_create_oauth_user ────────────────────────────────────────────────

pub(crate) async fn find_or_create_oauth_user(
  db: &DbPool,
  provider: &str,
  provider_user_id: &str,
  email: Option<&str>,
  name: Option<&str>,
  avatar_url: Option<&str>,
) -> Result<i64, AppError> {
  match db {
    DbPool::Sqlite(pool) => {
      // 1. Existing oauth link
      let existing: Option<(i64,)> = sqlx::query_as(
        "SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1",
      )
      .bind(provider)
      .bind(provider_user_id)
      .fetch_optional(pool)
      .await?;
      if let Some((uid,)) = existing {
        return Ok(uid);
      }

      // 2. Existing user with same email
      if let Some(em) = email {
        let user_row: Option<(i64,)> =
          sqlx::query_as("SELECT id FROM users WHERE email = ? LIMIT 1")
            .bind(em)
            .fetch_optional(pool)
            .await?;
        if let Some((uid,)) = user_row {
          sqlx::query(
            "INSERT OR IGNORE INTO oauth_accounts (user_id, provider, provider_user_id, email, name, avatar_url) \
             VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(uid)
          .bind(provider)
          .bind(provider_user_id)
          .bind(em)
          .bind(name)
          .bind(avatar_url)
          .execute(pool)
          .await?;
          return Ok(uid);
        }
      }

      // 3. Create new user
      let username = derive_username(name, email);
      let random_pw = bcrypt::hash(random_hex(32), 10)
        .map_err(|e| AppError::Internal(format!("bcrypt error: {}", e)))?;
      let email_val = email.unwrap_or("");

      let result = sqlx::query(
        "INSERT INTO users (username, email, password, email_verified) VALUES (?, ?, ?, 1)",
      )
      .bind(&username)
      .bind(email_val)
      .bind(&random_pw)
      .execute(pool)
      .await?;
      let uid = result.last_insert_rowid();

      sqlx::query(
        "INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email, name, avatar_url) \
         VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(uid)
      .bind(provider)
      .bind(provider_user_id)
      .bind(email)
      .bind(name)
      .bind(avatar_url)
      .execute(pool)
      .await?;

      Ok(uid)
    }
    DbPool::Postgres(pool) => {
      // 1. Existing oauth link
      let existing: Option<(i64,)> = sqlx::query_as(
        "SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2 LIMIT 1",
      )
      .bind(provider)
      .bind(provider_user_id)
      .fetch_optional(pool)
      .await?;
      if let Some((uid,)) = existing {
        return Ok(uid);
      }

      // 2. Existing user with same email
      if let Some(em) = email {
        let user_row: Option<(i64,)> =
          sqlx::query_as("SELECT id FROM users WHERE email = $1 LIMIT 1")
            .bind(em)
            .fetch_optional(pool)
            .await?;
        if let Some((uid,)) = user_row {
          sqlx::query(
            "INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email, name, avatar_url) \
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
          )
          .bind(uid)
          .bind(provider)
          .bind(provider_user_id)
          .bind(em)
          .bind(name)
          .bind(avatar_url)
          .execute(pool)
          .await?;
          return Ok(uid);
        }
      }

      // 3. Create new user
      let username = derive_username(name, email);
      let random_pw = bcrypt::hash(random_hex(32), 10)
        .map_err(|e| AppError::Internal(format!("bcrypt error: {}", e)))?;
      let email_val = email.unwrap_or("");

      let row: (i64,) = sqlx::query_as(
        "INSERT INTO users (username, email, password, email_verified) \
         VALUES ($1, $2, $3, 1) RETURNING id",
      )
      .bind(&username)
      .bind(email_val)
      .bind(&random_pw)
      .fetch_one(pool)
      .await?;
      let uid = row.0;

      sqlx::query(
        "INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email, name, avatar_url) \
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
      )
      .bind(uid)
      .bind(provider)
      .bind(provider_user_id)
      .bind(email)
      .bind(name)
      .bind(avatar_url)
      .execute(pool)
      .await?;

      Ok(uid)
    }
  }
}

fn derive_username(name: Option<&str>, email: Option<&str>) -> String {
  name
    .map(|n| n.to_string())
    .or_else(|| {
      email.map(|e| e.split('@').next().unwrap_or("user").to_string())
    })
    .unwrap_or_else(|| format!("user_{}", random_hex(4)))
}

fn random_hex(bytes: usize) -> String {
  let mut buf = vec![0u8; bytes];
  rand::thread_rng().fill_bytes(&mut buf);
  hex::encode(buf)
}

// ─── Manual token exchange helper ────────────────────────────────────────────
// We use reqwest directly to avoid oauth2 v5 typestate complexity in shared helpers.

#[derive(Deserialize)]
struct TokenExchangeResponse {
  access_token: String,
}

async fn exchange_code_for_token(
  http_client: &reqwest::Client,
  token_url: &str,
  client_id: &str,
  client_secret: &str,
  code: &str,
  redirect_uri: &str,
  pkce_verifier: Option<&str>,
) -> Result<String, String> {
  let mut params = vec![
    ("grant_type", "authorization_code"),
    ("client_id", client_id),
    ("client_secret", client_secret),
    ("code", code),
    ("redirect_uri", redirect_uri),
  ];

  let verifier_owned;
  if let Some(v) = pkce_verifier {
    verifier_owned = v.to_string();
    params.push(("code_verifier", &verifier_owned));
  }

  let resp = http_client
    .post(token_url)
    .header("Accept", "application/json")
    .form(&params)
    .send()
    .await
    .map_err(|e| format!("HTTP error: {}", e))?;

  if !resp.status().is_success() {
    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    return Err(format!("Token endpoint returned {}: {}", status, body));
  }

  let data: TokenExchangeResponse = resp
    .json()
    .await
    .map_err(|e| format!("Parse error: {}", e))?;

  Ok(data.access_token)
}

// ─── Authorization URL helpers (uses oauth2 crate for PKCE/state generation) ─

fn google_auth_url(
  client_id: &str,
  redirect_uri: &str,
) -> Result<(String, CsrfToken, PkceCodeChallenge, PkceCodeVerifier), AppError> {
  let client = BasicClient::new(ClientId::new(client_id.to_string()))
    .set_auth_uri(
      AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())
        .map_err(|e| AppError::Internal(format!("Invalid auth URL: {}", e)))?,
    )
    .set_redirect_uri(
      RedirectUrl::new(redirect_uri.to_string())
        .map_err(|e| AppError::Internal(format!("Invalid redirect URL: {}", e)))?,
    );

  let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

  let (url, csrf) = client
    .authorize_url(CsrfToken::new_random)
    .add_scope(Scope::new("openid".to_string()))
    .add_scope(Scope::new("email".to_string()))
    .add_scope(Scope::new("profile".to_string()))
    .set_pkce_challenge(pkce_challenge.clone())
    .url();

  Ok((url.to_string(), csrf, pkce_challenge, pkce_verifier))
}

fn github_auth_url(
  client_id: &str,
  redirect_uri: &str,
) -> Result<(String, CsrfToken, PkceCodeChallenge, PkceCodeVerifier), AppError> {
  let client = BasicClient::new(ClientId::new(client_id.to_string()))
    .set_auth_uri(
      AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
        .map_err(|e| AppError::Internal(format!("Invalid auth URL: {}", e)))?,
    )
    .set_redirect_uri(
      RedirectUrl::new(redirect_uri.to_string())
        .map_err(|e| AppError::Internal(format!("Invalid redirect URL: {}", e)))?,
    );

  let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

  let (url, csrf) = client
    .authorize_url(CsrfToken::new_random)
    .add_scope(Scope::new("read:user".to_string()))
    .add_scope(Scope::new("user:email".to_string()))
    .set_pkce_challenge(pkce_challenge.clone())
    .url();

  Ok((url.to_string(), csrf, pkce_challenge, pkce_verifier))
}

fn apple_auth_url(
  client_id: &str,
  redirect_uri: &str,
) -> Result<(String, CsrfToken), AppError> {
  let client = BasicClient::new(ClientId::new(client_id.to_string()))
    .set_auth_uri(
      AuthUrl::new("https://appleid.apple.com/auth/authorize".to_string())
        .map_err(|e| AppError::Internal(format!("Invalid auth URL: {}", e)))?,
    )
    .set_redirect_uri(
      RedirectUrl::new(redirect_uri.to_string())
        .map_err(|e| AppError::Internal(format!("Invalid redirect URL: {}", e)))?,
    );

  let csrf = CsrfToken::new_random();
  let csrf_clone = csrf.clone();

  let (url, _) = client
    .authorize_url(move || csrf_clone.clone())
    .add_scope(Scope::new("name".to_string()))
    .add_scope(Scope::new("email".to_string()))
    .url();

  // Append response_mode=form_post (Apple requires this)
  let url_with_mode = format!("{}&response_mode=form_post", url);
  Ok((url_with_mode, csrf))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Google handlers
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn google_auth(
  State(state): State<AppState>,
  jar: CookieJar,
) -> Result<(CookieJar, Redirect), AppError> {
  let client_id = state
    .config
    .google_client_id
    .as_deref()
    .ok_or_else(|| AppError::BadRequest("Google OAuth not configured".to_string()))?;

  let redirect_uri = format!("{}/auth/google/callback", backend_base(&state.config));

  let (url, csrf, _challenge, verifier) = google_auth_url(client_id, &redirect_uri)?;

  let jar = jar
    .add(build_state_cookie(csrf.secret().clone()))
    .add(build_verifier_cookie(verifier.secret().clone()));

  Ok((jar, Redirect::to(&url)))
}

#[derive(Deserialize)]
struct GoogleUserInfo {
  sub: String,
  email: Option<String>,
  name: Option<String>,
  picture: Option<String>,
}

pub async fn google_callback(
  State(state): State<AppState>,
  jar: CookieJar,
  Query(params): Query<OAuthCallbackParams>,
) -> Response {
  if params.error.is_some() {
    let jar = clear_oauth_cookies(jar);
    return (jar, oauth_error_redirect(&state.config, "oauth_denied")).into_response();
  }

  let code = match &params.code {
    Some(c) => c.clone(),
    None => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_missing_code")).into_response();
    }
  };

  if !check_state(&jar, params.state.as_ref()) {
    let jar = clear_oauth_cookies(jar);
    return (jar, oauth_error_redirect(&state.config, "oauth_state_mismatch")).into_response();
  }

  let verifier = match jar.get(OAUTH_VERIFIER_COOKIE).map(|c| c.value().to_string()) {
    Some(v) if !v.is_empty() => v,
    _ => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_verifier_missing")).into_response();
    }
  };

  let (client_id, client_secret) = match (
    state.config.google_client_id.as_deref(),
    state.config.google_client_secret.as_deref(),
  ) {
    (Some(id), Some(sec)) => (id.to_string(), sec.to_string()),
    _ => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_not_configured")).into_response();
    }
  };

  let redirect_uri = format!("{}/auth/google/callback", backend_base(&state.config));

  let token = exchange_code_for_token(
    &state.http_client,
    "https://oauth2.googleapis.com/token",
    &client_id,
    &client_secret,
    &code,
    &redirect_uri,
    Some(&verifier),
  )
  .await;

  let access_token = match token {
    Ok(t) => t,
    Err(e) => {
      tracing::warn!(error = %e, "Google token exchange failed");
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_token_exchange_failed"))
        .into_response();
    }
  };

  let userinfo_resp = state
    .http_client
    .get("https://www.googleapis.com/oauth2/v3/userinfo")
    .bearer_auth(&access_token)
    .send()
    .await;

  let userinfo: GoogleUserInfo = match userinfo_resp {
    Ok(r) => match r.json().await {
      Ok(u) => u,
      Err(e) => {
        tracing::warn!(error = %e, "Failed to parse Google user info");
        let jar = clear_oauth_cookies(jar);
        return (jar, oauth_error_redirect(&state.config, "oauth_userinfo_error")).into_response();
      }
    },
    Err(e) => {
      tracing::warn!(error = %e, "Failed to fetch Google user info");
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_userinfo_error")).into_response();
    }
  };

  let jar = clear_oauth_cookies(jar);
  finish_oauth(
    jar,
    &state,
    "google",
    &userinfo.sub,
    userinfo.email.as_deref(),
    userinfo.name.as_deref(),
    userinfo.picture.as_deref(),
  )
  .await
}

// ═══════════════════════════════════════════════════════════════════════════════
// GitHub handlers
// ═══════════════════════════════════════════════════════════════════════════════

pub async fn github_auth(
  State(state): State<AppState>,
  jar: CookieJar,
) -> Result<(CookieJar, Redirect), AppError> {
  let client_id = state
    .config
    .github_client_id
    .as_deref()
    .ok_or_else(|| AppError::BadRequest("GitHub OAuth not configured".to_string()))?;

  let redirect_uri = format!("{}/auth/github/callback", backend_base(&state.config));
  let (url, csrf, _challenge, verifier) = github_auth_url(client_id, &redirect_uri)?;

  let jar = jar
    .add(build_state_cookie(csrf.secret().clone()))
    .add(build_verifier_cookie(verifier.secret().clone()));

  Ok((jar, Redirect::to(&url)))
}

#[derive(Deserialize)]
struct GitHubUser {
  id: i64,
  login: Option<String>,
  name: Option<String>,
  email: Option<String>,
  avatar_url: Option<String>,
}

#[derive(Deserialize)]
struct GitHubEmail {
  email: String,
  primary: bool,
  verified: bool,
}

pub async fn github_callback(
  State(state): State<AppState>,
  jar: CookieJar,
  Query(params): Query<OAuthCallbackParams>,
) -> Response {
  if params.error.is_some() {
    let jar = clear_oauth_cookies(jar);
    return (jar, oauth_error_redirect(&state.config, "oauth_denied")).into_response();
  }

  let code = match &params.code {
    Some(c) => c.clone(),
    None => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_missing_code")).into_response();
    }
  };

  if !check_state(&jar, params.state.as_ref()) {
    let jar = clear_oauth_cookies(jar);
    return (jar, oauth_error_redirect(&state.config, "oauth_state_mismatch")).into_response();
  }

  let verifier = match jar.get(OAUTH_VERIFIER_COOKIE).map(|c| c.value().to_string()) {
    Some(v) if !v.is_empty() => v,
    _ => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_verifier_missing")).into_response();
    }
  };

  let (client_id, client_secret) = match (
    state.config.github_client_id.as_deref(),
    state.config.github_client_secret.as_deref(),
  ) {
    (Some(id), Some(sec)) => (id.to_string(), sec.to_string()),
    _ => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_not_configured")).into_response();
    }
  };

  let redirect_uri = format!("{}/auth/github/callback", backend_base(&state.config));

  let token = exchange_code_for_token(
    &state.http_client,
    "https://github.com/login/oauth/access_token",
    &client_id,
    &client_secret,
    &code,
    &redirect_uri,
    Some(&verifier),
  )
  .await;

  let access_token = match token {
    Ok(t) => t,
    Err(e) => {
      tracing::warn!(error = %e, "GitHub token exchange failed");
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_token_exchange_failed"))
        .into_response();
    }
  };

  // Fetch user profile
  let user_resp = state
    .http_client
    .get("https://api.github.com/user")
    .bearer_auth(&access_token)
    .header("Accept", "application/json")
    .header("User-Agent", "chatgpt-backend/1.0")
    .send()
    .await;

  let gh_user: GitHubUser = match user_resp {
    Ok(r) => match r.json().await {
      Ok(u) => u,
      Err(e) => {
        tracing::warn!(error = %e, "Failed to parse GitHub user");
        let jar = clear_oauth_cookies(jar);
        return (jar, oauth_error_redirect(&state.config, "oauth_userinfo_error")).into_response();
      }
    },
    Err(e) => {
      tracing::warn!(error = %e, "Failed to fetch GitHub user");
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_userinfo_error")).into_response();
    }
  };

  // If email is null, fetch from /user/emails
  let email: Option<String> = if gh_user.email.is_some() {
    gh_user.email.clone()
  } else {
    let emails_resp = state
      .http_client
      .get("https://api.github.com/user/emails")
      .bearer_auth(&access_token)
      .header("Accept", "application/json")
      .header("User-Agent", "chatgpt-backend/1.0")
      .send()
      .await;

    match emails_resp {
      Ok(r) => match r.json::<Vec<GitHubEmail>>().await {
        Ok(list) => list
          .into_iter()
          .find(|e| e.primary && e.verified)
          .map(|e| e.email),
        Err(_) => None,
      },
      Err(_) => None,
    }
  };

  let display_name = gh_user.name.or(gh_user.login);
  let provider_id = gh_user.id.to_string();
  let jar = clear_oauth_cookies(jar);

  finish_oauth(
    jar,
    &state,
    "github",
    &provider_id,
    email.as_deref(),
    display_name.as_deref(),
    gh_user.avatar_url.as_deref(),
  )
  .await
}

// ═══════════════════════════════════════════════════════════════════════════════
// Apple handlers
// ═══════════════════════════════════════════════════════════════════════════════

fn build_apple_client_secret(
  team_id: &str,
  key_id: &str,
  client_id: &str,
  private_key_pem: &str,
) -> Result<String, AppError> {
  #[derive(Serialize)]
  struct AppleClaims {
    iss: String,
    iat: i64,
    exp: i64,
    aud: String,
    sub: String,
  }

  let now = Utc::now().timestamp();
  let claims = AppleClaims {
    iss: team_id.to_string(),
    iat: now,
    exp: now + 180 * 24 * 3600,
    aud: "https://appleid.apple.com".to_string(),
    sub: client_id.to_string(),
  };

  let mut header = Header::new(Algorithm::ES256);
  header.kid = Some(key_id.to_string());

  encode(
    &header,
    &claims,
    &EncodingKey::from_ec_pem(private_key_pem.as_bytes())
      .map_err(|e| AppError::Internal(format!("Apple private key error: {}", e)))?,
  )
  .map_err(|e| AppError::Internal(format!("Apple JWT encode error: {}", e)))
}

pub async fn apple_auth(
  State(state): State<AppState>,
  jar: CookieJar,
) -> Result<(CookieJar, Redirect), AppError> {
  let client_id = state
    .config
    .apple_client_id
    .as_deref()
    .ok_or_else(|| AppError::BadRequest("Apple OAuth not configured".to_string()))?;

  let redirect_uri = format!("{}/auth/apple/callback", backend_base(&state.config));
  let (url, csrf) = apple_auth_url(client_id, &redirect_uri)?;

  let jar = jar.add(build_state_cookie(csrf.secret().clone()));
  Ok((jar, Redirect::to(&url)))
}

fn decode_id_token_claims(id_token: &str) -> Option<Value> {
  let parts: Vec<&str> = id_token.split('.').collect();
  if parts.len() < 2 {
    return None;
  }
  let payload_b64 = parts[1];
  let padded = match payload_b64.len() % 4 {
    0 => payload_b64.to_string(),
    2 => format!("{}==", payload_b64),
    3 => format!("{}=", payload_b64),
    _ => return None,
  };
  let padded = padded.replace('-', "+").replace('_', "/");
  let decoded = BASE64.decode(padded).ok()?;
  serde_json::from_slice(&decoded).ok()
}

#[derive(Deserialize)]
struct AppleUserName {
  #[serde(rename = "firstName")]
  first_name: Option<String>,
  #[serde(rename = "lastName")]
  last_name: Option<String>,
}

#[derive(Deserialize)]
struct AppleUserPayload {
  name: Option<AppleUserName>,
}

pub async fn apple_callback(
  State(state): State<AppState>,
  jar: CookieJar,
  Form(params): Form<AppleCallbackParams>,
) -> Response {
  if params.error.is_some() {
    let jar = clear_oauth_cookies(jar);
    return (jar, oauth_error_redirect(&state.config, "oauth_denied")).into_response();
  }

  let _code = match &params.code {
    Some(c) => c.clone(),
    None => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_missing_code")).into_response();
    }
  };

  if !check_state(&jar, params.state.as_ref()) {
    let jar = clear_oauth_cookies(jar);
    return (jar, oauth_error_redirect(&state.config, "oauth_state_mismatch")).into_response();
  }

  let id_token = match &params.id_token {
    Some(t) => t.clone(),
    None => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_missing_id_token")).into_response();
    }
  };

  let claims = match decode_id_token_claims(&id_token) {
    Some(c) => c,
    None => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_invalid_id_token")).into_response();
    }
  };

  let sub = match claims.get("sub").and_then(|v| v.as_str()) {
    Some(s) => s.to_string(),
    None => {
      let jar = clear_oauth_cookies(jar);
      return (jar, oauth_error_redirect(&state.config, "oauth_missing_sub")).into_response();
    }
  };

  let email = claims
    .get("email")
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  let name: Option<String> = params.user.as_deref().and_then(|user_json| {
    let payload: Result<AppleUserPayload, _> = serde_json::from_str(user_json);
    match payload {
      Ok(p) => p.name.map(|n| {
        [n.first_name, n.last_name]
          .iter()
          .filter_map(|part| part.clone())
          .collect::<Vec<_>>()
          .join(" ")
      }),
      Err(_) => None,
    }
  });

  let jar = clear_oauth_cookies(jar);

  finish_oauth(
    jar,
    &state,
    "apple",
    &sub,
    email.as_deref(),
    name.as_deref(),
    None,
  )
  .await
}

// ─── Shared finish helper ─────────────────────────────────────────────────────

async fn finish_oauth(
  jar: CookieJar,
  state: &AppState,
  provider: &str,
  provider_user_id: &str,
  email: Option<&str>,
  name: Option<&str>,
  avatar_url: Option<&str>,
) -> Response {
  let user_id = match find_or_create_oauth_user(
    &state.db,
    provider,
    provider_user_id,
    email,
    name,
    avatar_url,
  )
  .await
  {
    Ok(uid) => uid,
    Err(e) => {
      tracing::error!(error = %e, provider = %provider, "Failed to find/create OAuth user");
      return oauth_error_redirect(&state.config, "oauth_db_error").into_response();
    }
  };

  match oauth_success_redirect(jar, user_id, state) {
    Ok(resp) => resp.into_response(),
    Err(_) => oauth_error_redirect(&state.config, "oauth_session_error").into_response(),
  }
}
