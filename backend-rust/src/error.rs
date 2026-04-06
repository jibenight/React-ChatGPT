use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Value};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Forbidden")]
    Forbidden,

    #[error("Plan limit exceeded")]
    PlanLimitExceeded {
        error: String,
        limit: Option<i32>,
        current: i32,
        allowed: Option<i32>,
        plan: String,
        upgrade_url: String,
    },

    #[error("Too many requests")]
    TooManyRequests,

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Unauthorized" })),
            )
                .into_response(),

            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": msg })),
            )
                .into_response(),

            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": msg })),
            )
                .into_response(),

            AppError::Forbidden => (
                StatusCode::FORBIDDEN,
                Json(json!({ "error": "Forbidden" })),
            )
                .into_response(),

            AppError::PlanLimitExceeded {
                error,
                limit,
                current,
                allowed,
                plan,
                upgrade_url,
            } => (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "plan_limit_exceeded",
                    "message": error,
                    "limit": limit,
                    "current": current,
                    "allowed": allowed,
                    "plan": plan,
                    "upgrade_url": upgrade_url,
                })),
            )
                .into_response(),

            AppError::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({ "error": "Too many requests" })),
            )
                .into_response(),

            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(json!({ "error": msg })),
            )
                .into_response(),

            AppError::Sqlx(e) => {
                tracing::error!(error = %e, "Database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Internal server error" })),
                )
                    .into_response()
            }

            AppError::Internal(msg) => {
                tracing::error!(error = %msg, "Internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Internal server error" })),
                )
                    .into_response()
            }

            AppError::Anyhow(e) => {
                tracing::error!(error = %e, "Unhandled error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Internal server error" })),
                )
                    .into_response()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    async fn response_parts(err: AppError) -> (StatusCode, Value) {
        let response = err.into_response();
        let status = response.status();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();
        (status, json)
    }

    #[tokio::test]
    async fn test_unauthorized_response() {
        let (status, body) = response_parts(AppError::Unauthorized).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["error"], "Unauthorized");
    }

    #[tokio::test]
    async fn test_bad_request_response() {
        let (status, body) = response_parts(AppError::BadRequest("invalid input".to_string())).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body["error"], "invalid input");
    }

    #[tokio::test]
    async fn test_not_found_response() {
        let (status, body) = response_parts(AppError::NotFound("resource".to_string())).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["error"], "resource");
    }

    #[tokio::test]
    async fn test_forbidden_response() {
        let (status, body) = response_parts(AppError::Forbidden).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        assert_eq!(body["error"], "Forbidden");
    }

    #[tokio::test]
    async fn test_plan_limit_response() {
        let err = AppError::PlanLimitExceeded {
            error: "Daily message limit reached".to_string(),
            limit: Some(50),
            current: 51,
            allowed: Some(50),
            plan: "free".to_string(),
            upgrade_url: "/pricing".to_string(),
        };
        let (status, body) = response_parts(err).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        assert_eq!(body["error"], "plan_limit_exceeded");
        assert_eq!(body["message"], "Daily message limit reached");
        assert_eq!(body["limit"], 50);
        assert_eq!(body["current"], 51);
        assert_eq!(body["allowed"], 50);
        assert_eq!(body["plan"], "free");
        assert_eq!(body["upgrade_url"], "/pricing");
    }

    #[tokio::test]
    async fn test_too_many_requests_response() {
        let (status, body) = response_parts(AppError::TooManyRequests).await;
        assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(body["error"], "Too many requests");
    }

    #[tokio::test]
    async fn test_validation_response() {
        let (status, body) = response_parts(AppError::Validation("field is required".to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(body["error"], "field is required");
    }

    #[tokio::test]
    async fn test_internal_response() {
        let (status, body) = response_parts(AppError::Internal("db timeout".to_string())).await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(body["error"], "Internal server error");
    }
}
