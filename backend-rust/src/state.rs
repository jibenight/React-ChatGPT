use crate::config::AppConfig;
use crate::db::DbPool;
use crate::services::{ApiKeyCache, Mailer};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub config: Arc<AppConfig>,
    pub http_client: reqwest::Client,
    pub api_key_cache: Arc<ApiKeyCache>,
    pub mailer: Arc<Mailer>,
}

impl AppState {
    pub fn new(db: DbPool, config: AppConfig) -> Self {
        let http_client = reqwest::Client::builder()
            .use_rustls_tls()
            .build()
            .expect("Failed to build HTTP client");

        let mailer = Mailer::new(&config);
        let api_key_cache = ApiKeyCache::new();

        AppState {
            db,
            config: Arc::new(config),
            http_client,
            api_key_cache: Arc::new(api_key_cache),
            mailer: Arc::new(mailer),
        }
    }
}
