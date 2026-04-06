use crate::error::AppError;
use axum::{
    extract::{FromRequestParts, Query},
    http::request::Parts,
};
use serde::de::DeserializeOwned;
use validator::Validate;

/// Extractor that deserializes query parameters and then validates them via `validator`.
pub struct ValidatedQuery<T>(pub T);

impl<T, S> FromRequestParts<S> for ValidatedQuery<T>
where
    T: DeserializeOwned + Validate,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let Query(value) = Query::<T>::from_request_parts(parts, state)
            .await
            .map_err(|e| AppError::BadRequest(e.to_string()))?;

        value
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        Ok(ValidatedQuery(value))
    }
}
