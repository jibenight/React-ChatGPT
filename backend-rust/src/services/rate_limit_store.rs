use crate::db::DbPool;
use crate::error::AppError;

/// DB-backed rate limit store.
/// Uses the `rate_limits` table (key, count, window_start, window_ms).
pub struct RateLimitStore;

impl RateLimitStore {
    /// Check if the rate limit has been exceeded, and if not, increment the counter.
    /// Returns `Ok(true)` if the request is allowed, `Ok(false)` if rate-limited.
    pub async fn check_and_increment(
        db: &DbPool,
        key: &str,
        max_requests: i32,
        window_ms: i64,
    ) -> Result<bool, AppError> {
        let now_ms = chrono::Utc::now().timestamp_millis();

        match db {
            DbPool::Sqlite(pool) => {
                // Atomic upsert: reset if window expired, otherwise increment.
                sqlx::query(
                    "INSERT INTO rate_limits (key, count, window_start, window_ms)
                     VALUES (?, 1, ?, ?)
                     ON CONFLICT(key) DO UPDATE SET
                       count = CASE WHEN window_start + window_ms < ? THEN 1 ELSE count + 1 END,
                       window_start = CASE WHEN window_start + window_ms < ? THEN ? ELSE window_start END",
                )
                .bind(key)
                .bind(now_ms)
                .bind(window_ms)
                .bind(now_ms)
                .bind(now_ms)
                .bind(now_ms)
                .execute(pool)
                .await?;

                let row: (i32,) = sqlx::query_as(
                    "SELECT count FROM rate_limits WHERE key = ?",
                )
                .bind(key)
                .fetch_one(pool)
                .await?;

                Ok(row.0 <= max_requests)
            }
            DbPool::Postgres(pool) => {
                sqlx::query(
                    "INSERT INTO rate_limits (key, count, window_start, window_ms)
                     VALUES ($1, 1, $2, $3)
                     ON CONFLICT(key) DO UPDATE SET
                       count = CASE WHEN rate_limits.window_start + rate_limits.window_ms < $4 THEN 1 ELSE rate_limits.count + 1 END,
                       window_start = CASE WHEN rate_limits.window_start + rate_limits.window_ms < $4 THEN $4 ELSE rate_limits.window_start END",
                )
                .bind(key)
                .bind(now_ms)
                .bind(window_ms)
                .bind(now_ms)
                .execute(pool)
                .await?;

                let row: (i32,) = sqlx::query_as(
                    "SELECT count FROM rate_limits WHERE key = $1",
                )
                .bind(key)
                .fetch_one(pool)
                .await?;

                Ok(row.0 <= max_requests)
            }
        }
    }

    /// Delete expired rate limit entries.
    pub async fn cleanup(db: &DbPool) -> Result<(), AppError> {
        let now_ms = chrono::Utc::now().timestamp_millis();
        match db {
            DbPool::Sqlite(pool) => {
                sqlx::query(
                    "DELETE FROM rate_limits WHERE window_start + window_ms < ?",
                )
                .bind(now_ms)
                .execute(pool)
                .await?;
            }
            DbPool::Postgres(pool) => {
                sqlx::query(
                    "DELETE FROM rate_limits WHERE window_start + window_ms < $1",
                )
                .bind(now_ms)
                .execute(pool)
                .await?;
            }
        }
        Ok(())
    }
}
