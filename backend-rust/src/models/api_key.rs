use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApiKey {
    pub id: i64,
    pub user_id: i64,
    pub provider: String,
    pub api_key: String,
}
