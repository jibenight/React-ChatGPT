use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Plan {
    pub id: String,
    pub name: String,
    pub stripe_price_id_monthly: Option<String>,
    pub stripe_price_id_yearly: Option<String>,
    pub max_projects: Option<i32>,
    pub max_threads_per_project: Option<i32>,
    pub max_messages_per_day: Option<i32>,
    pub max_providers: Option<i32>,
    pub collaboration_enabled: i32,
    pub local_model_limit: Option<i32>,
    pub created_at: String,
}
