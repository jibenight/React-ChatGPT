use crate::db::DbPool;
use crate::error::AppError;
use crate::services::rate_limit_store::RateLimitStore;

/// Check the rate limit for a given key and return an error if exceeded.
///
/// `key` should be scoped to the endpoint, e.g. `"login:192.168.1.1"` or `"chat:42"`.
/// `max_requests` is the maximum number of requests allowed in `window_ms` milliseconds.
pub async fn check_rate_limit(
    db: &DbPool,
    key: &str,
    max_requests: i32,
    window_ms: i64,
) -> Result<(), AppError> {
    if !RateLimitStore::check_and_increment(db, key, max_requests, window_ms).await? {
        return Err(AppError::TooManyRequests);
    }
    Ok(())
}
