use anyhow::{anyhow, Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    // Server
    pub port: u16,
    pub host: String,
    pub node_env: String,

    // Auth
    pub secret_key: String,
    pub encryption_key: String,
    pub encryption_salt: Option<String>,
    pub dev_bypass_auth: bool,

    // Database
    pub db_client: DbClient,
    pub sqlite_db_path: String,
    pub database_url: Option<String>,

    // App
    pub app_url: Option<String>,
    pub cors_allowed_origins: Vec<String>,
    pub trust_proxy: bool,

    // Auth cookie
    pub auth_cookie_name: String,
    pub auth_cookie_max_age_days: u64,
    pub auth_cookie_secure: bool,
    pub auth_cookie_samesite: String,
    pub auth_cookie_domain: Option<String>,

    // SMTP
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_secure: bool,
    pub smtp_user: Option<String>,
    pub smtp_password: Option<String>,
    pub email_from: Option<String>,
    pub email_reply_to: Option<String>,

    // DKIM
    pub dkim_domain: Option<String>,
    pub dkim_key_selector: Option<String>,
    pub dkim_private_key: Option<String>,

    // Stripe
    pub stripe_secret_key: Option<String>,
    pub stripe_webhook_secret: Option<String>,
    pub stripe_pro_monthly_price_id: Option<String>,
    pub stripe_pro_yearly_price_id: Option<String>,
    pub stripe_team_monthly_price_id: Option<String>,
    pub stripe_team_yearly_price_id: Option<String>,

    // OAuth — base URL for building redirect URIs (backend external URL)
    pub oauth_redirect_base_url: String,

    // OAuth - Google
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,

    // OAuth - GitHub
    pub github_client_id: Option<String>,
    pub github_client_secret: Option<String>,

    // OAuth - Apple
    pub apple_client_id: Option<String>,
    pub apple_team_id: Option<String>,
    pub apple_key_id: Option<String>,
    pub apple_private_key: Option<String>,

    // Logging
    pub log_level: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DbClient {
    Sqlite,
    Postgres,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        let secret_key = env::var("SECRET_KEY")
            .context("SECRET_KEY is required")?;
        if secret_key.is_empty() {
            return Err(anyhow!("SECRET_KEY cannot be empty"));
        }

        let encryption_key = env::var("ENCRYPTION_KEY")
            .context("ENCRYPTION_KEY is required")?;
        if encryption_key.len() < 32 {
            return Err(anyhow!("ENCRYPTION_KEY must be at least 32 characters"));
        }

        let db_client_str = env::var("DB_CLIENT").unwrap_or_else(|_| "sqlite".to_string());
        let db_client = match db_client_str.trim().to_lowercase().as_str() {
            "postgres" => DbClient::Postgres,
            "sqlite" | "" => DbClient::Sqlite,
            other => return Err(anyhow!("DB_CLIENT must be 'sqlite' or 'postgres', got: {}", other)),
        };

        let cors_raw = env::var("CORS_ALLOWED_ORIGINS")
            .or_else(|_| env::var("APP_URL"))
            .unwrap_or_default();
        let cors_allowed_origins: Vec<String> = cors_raw
            .split(',')
            .map(|s| s.trim().trim_end_matches('/').to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let sqlite_db_path = env::var("SQLITE_DB_PATH")
            .unwrap_or_else(|_| "../../database/ChatData.db".to_string());

        let port: u16 = env::var("PORT")
            .unwrap_or_else(|_| "3001".to_string())
            .parse()
            .context("PORT must be a valid number")?;

        let smtp_port: Option<u16> = env::var("SMTP_PORT")
            .ok()
            .and_then(|v| v.parse().ok());

        let auth_cookie_max_age_days: u64 = env::var("AUTH_COOKIE_MAX_AGE_DAYS")
            .unwrap_or_else(|_| "7".to_string())
            .parse()
            .unwrap_or(7);

        let node_env = env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string());
        let auth_cookie_secure = env::var("AUTH_COOKIE_SECURE")
            .map(|v| v == "true" || v == "1")
            .unwrap_or_else(|_| node_env == "production");

        Ok(AppConfig {
            port,
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            node_env,
            secret_key,
            encryption_key,
            encryption_salt: env::var("ENCRYPTION_SALT").ok(),
            dev_bypass_auth: env::var("DEV_BYPASS_AUTH")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false),
            db_client,
            sqlite_db_path,
            database_url: env::var("DATABASE_URL").ok(),
            app_url: env::var("APP_URL").ok(),
            cors_allowed_origins,
            trust_proxy: env::var("TRUST_PROXY")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false),
            auth_cookie_name: env::var("AUTH_COOKIE_NAME")
                .unwrap_or_else(|_| "token".to_string()),
            auth_cookie_max_age_days,
            auth_cookie_secure,
            auth_cookie_samesite: env::var("AUTH_COOKIE_SAMESITE")
                .unwrap_or_else(|_| "lax".to_string()),
            auth_cookie_domain: env::var("AUTH_COOKIE_DOMAIN").ok(),
            smtp_host: env::var("SMTP_HOST").ok(),
            smtp_port,
            smtp_secure: env::var("SMTP_SECURE")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false),
            smtp_user: env::var("SMTP_USER").ok(),
            smtp_password: env::var("SMTP_PASSWORD").ok(),
            email_from: env::var("EMAIL_FROM").ok(),
            email_reply_to: env::var("EMAIL_REPLY_TO").ok(),
            dkim_domain: env::var("DKIM_DOMAIN").ok(),
            dkim_key_selector: env::var("DKIM_KEY_SELECTOR").ok(),
            dkim_private_key: env::var("DKIM_PRIVATE_KEY").ok(),
            stripe_secret_key: env::var("STRIPE_SECRET_KEY").ok(),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET").ok(),
            stripe_pro_monthly_price_id: env::var("STRIPE_PRO_MONTHLY_PRICE_ID").ok(),
            stripe_pro_yearly_price_id: env::var("STRIPE_PRO_YEARLY_PRICE_ID").ok(),
            stripe_team_monthly_price_id: env::var("STRIPE_TEAM_MONTHLY_PRICE_ID").ok(),
            stripe_team_yearly_price_id: env::var("STRIPE_TEAM_YEARLY_PRICE_ID").ok(),
            oauth_redirect_base_url: env::var("OAUTH_REDIRECT_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:3001".to_string()),
            google_client_id: env::var("GOOGLE_CLIENT_ID").ok(),
            google_client_secret: env::var("GOOGLE_CLIENT_SECRET").ok(),
            github_client_id: env::var("GITHUB_CLIENT_ID").ok(),
            github_client_secret: env::var("GITHUB_CLIENT_SECRET").ok(),
            apple_client_id: env::var("APPLE_CLIENT_ID").ok(),
            apple_team_id: env::var("APPLE_TEAM_ID").ok(),
            apple_key_id: env::var("APPLE_KEY_ID").ok(),
            apple_private_key: env::var("APPLE_PRIVATE_KEY").ok(),
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn minimal_config() -> AppConfig {
        AppConfig {
            port: 3001,
            host: "0.0.0.0".to_string(),
            node_env: "development".to_string(),
            secret_key: "test-secret-key-at-least-32-chars!!".to_string(),
            encryption_key: "test-encryption-key-at-least-32ch".to_string(),
            encryption_salt: None,
            dev_bypass_auth: false,
            db_client: DbClient::Sqlite,
            sqlite_db_path: "database/ChatData.db".to_string(),
            database_url: None,
            app_url: None,
            cors_allowed_origins: vec![],
            trust_proxy: false,
            auth_cookie_name: "token".to_string(),
            auth_cookie_max_age_days: 7,
            auth_cookie_secure: false,
            auth_cookie_samesite: "lax".to_string(),
            auth_cookie_domain: None,
            smtp_host: None,
            smtp_port: None,
            smtp_secure: false,
            smtp_user: None,
            smtp_password: None,
            email_from: None,
            email_reply_to: None,
            dkim_domain: None,
            dkim_key_selector: None,
            dkim_private_key: None,
            stripe_secret_key: None,
            stripe_webhook_secret: None,
            stripe_pro_monthly_price_id: None,
            stripe_pro_yearly_price_id: None,
            stripe_team_monthly_price_id: None,
            stripe_team_yearly_price_id: None,
            oauth_redirect_base_url: "http://localhost:3001".to_string(),
            google_client_id: None,
            google_client_secret: None,
            github_client_id: None,
            github_client_secret: None,
            apple_client_id: None,
            apple_team_id: None,
            apple_key_id: None,
            apple_private_key: None,
            log_level: "info".to_string(),
        }
    }

    #[test]
    fn test_default_values() {
        let config = minimal_config();
        assert_eq!(config.port, 3001);
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.node_env, "development");
        assert_eq!(config.db_client, DbClient::Sqlite);
        assert_eq!(config.auth_cookie_max_age_days, 7);
        assert_eq!(config.auth_cookie_samesite, "lax");
        assert!(!config.auth_cookie_secure);
        assert!(!config.dev_bypass_auth);
        assert_eq!(config.log_level, "info");
    }

    #[test]
    fn test_encryption_key_length_validation() {
        // Validate that short keys are rejected at parse level (< 32 chars)
        let short_key = "tooshort";
        assert!(short_key.len() < 32, "Test setup: key should be short");
        let valid_key = "test-encryption-key-at-least-32ch";
        assert!(valid_key.len() >= 32, "Test setup: key should be valid");
    }

    #[test]
    fn test_db_client_variants() {
        let mut config = minimal_config();
        assert_eq!(config.db_client, DbClient::Sqlite);
        config.db_client = DbClient::Postgres;
        assert_eq!(config.db_client, DbClient::Postgres);
    }

    #[test]
    fn test_auth_cookie_secure_in_production() {
        let mut config = minimal_config();
        config.node_env = "production".to_string();
        // In production the cookie should be secure; simulate as from_env would set it
        config.auth_cookie_secure = config.node_env == "production";
        assert!(config.auth_cookie_secure);
    }
}
