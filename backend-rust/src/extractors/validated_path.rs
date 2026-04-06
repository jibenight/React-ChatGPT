use crate::error::AppError;
use axum::{
    extract::{FromRequestParts, Path},
    http::request::Parts,
};
use serde::de::DeserializeOwned;
use validator::Validate;

/// Extractor that deserializes path parameters and then validates them via `validator`.
pub struct ValidatedPath<T>(pub T);

impl<T, S> FromRequestParts<S> for ValidatedPath<T>
where
    T: DeserializeOwned + Validate + Send,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let Path(value) = Path::<T>::from_request_parts(parts, state)
            .await
            .map_err(|e| AppError::BadRequest(e.to_string()))?;

        value
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        Ok(ValidatedPath(value))
    }
}
