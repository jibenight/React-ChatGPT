use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateThreadRequest {
    pub id: Option<String>,
    pub title: Option<String>,
    pub project_id: Option<i64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateThreadRequest {
    pub title: Option<serde_json::Value>,
    pub project_id: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ThreadIdParam {
    #[validate(length(min = 1))]
    pub thread_id: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ThreadMessagesQuery {
    pub before_id: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ExportThreadQuery {
    pub format: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ProjectThreadsParam {
    pub project_id: i64,
}
