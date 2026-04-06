use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Thread {
    /// UUID stored as TEXT
    pub id: String,
    pub user_id: i64,
    pub project_id: Option<i64>,
    pub title: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_message_at: Option<String>,
}
