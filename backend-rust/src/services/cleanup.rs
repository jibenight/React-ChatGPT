use crate::db::DbPool;
use crate::services::rate_limit_store::RateLimitStore;
use std::time::Duration;

/// Spawn background tasks for periodic cleanup.
pub fn spawn_cleanup_tasks(db: DbPool) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            if let Err(e) = RateLimitStore::cleanup(&db).await {
                tracing::warn!(error = %e, "Rate limit cleanup failed");
            }
        }
    });
}
