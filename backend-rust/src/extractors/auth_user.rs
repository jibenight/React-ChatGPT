use crate::error::AppError;
use axum::{extract::FromRequestParts, http::request::Parts};

/// Plan limits attached to an authenticated user session.
#[derive(Debug, Clone)]
pub struct PlanData {
    pub plan_id: String,
    pub max_projects: Option<i32>,
    pub max_threads_per_project: Option<i32>,
    pub max_messages_per_day: Option<i32>,
    pub max_providers: Option<i32>,
    pub collaboration_enabled: bool,
}

/// Represents a successfully authenticated user.
///
/// Set in request extensions by the `require_auth` middleware.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i64,
    pub is_dev: bool,
    pub plan: Option<PlanData>,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthUser>()
            .cloned()
            .ok_or(AppError::Unauthorized)
    }
}
