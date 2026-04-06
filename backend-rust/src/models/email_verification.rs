use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EmailVerification {
    pub id: i64,
    pub email: String,
    pub token: String,
    pub expires_at: String,
}
