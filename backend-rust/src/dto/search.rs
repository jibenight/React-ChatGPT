use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct SearchQuery {
    #[validate(length(min = 1, max = 200))]
    pub q: String,
    pub thread_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
