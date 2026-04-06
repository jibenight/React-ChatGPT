use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DesktopLicense {
    pub id: i64,
    pub license_key: String,
    pub user_id: Option<i64>,
    pub email: String,
    pub plan_id: String,
    pub activated_at: Option<String>,
    pub expires_at: Option<String>,
    pub stripe_payment_id: Option<String>,
    pub created_at: String,
}
