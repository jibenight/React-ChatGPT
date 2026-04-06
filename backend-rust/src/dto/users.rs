use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateApiKeyRequest {
    #[validate(length(min = 1))]
    pub provider: String,
    #[validate(length(min = 1))]
    pub api_key: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserDataRequest {
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ProviderParam {
    #[validate(length(min = 1))]
    pub provider: String,
}
