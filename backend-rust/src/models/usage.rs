use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UsageDaily {
    pub id: i64,
    pub user_id: i64,
    pub date: String,
    pub message_count: i32,
}
