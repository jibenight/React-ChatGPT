/// Tests for RateLimitStore logic.
///
/// The DB-backed store requires a live SQLite connection, so these tests
/// spin up an in-memory SQLite database and initialize the schema.
use crate::db::{schema, DbPool};
use crate::services::rate_limit_store::RateLimitStore;
use sqlx::SqlitePool;

async fn make_db() -> DbPool {
    let pool = SqlitePool::connect(":memory:")
        .await
        .expect("in-memory SQLite");
    let db = DbPool::Sqlite(pool);
    schema::initialize(&db)
        .await
        .expect("schema init");
    db
}

#[tokio::test]
async fn first_request_is_allowed() {
    let db = make_db().await;
    let allowed = RateLimitStore::check_and_increment(&db, "test:1", 5, 60_000)
        .await
        .unwrap();
    assert!(allowed, "first request should be allowed");
}

#[tokio::test]
async fn requests_within_limit_are_allowed() {
    let db = make_db().await;
    for i in 1..=5 {
        let allowed = RateLimitStore::check_and_increment(&db, "test:2", 5, 60_000)
            .await
            .unwrap();
        assert!(allowed, "request {} should be allowed", i);
    }
}

#[tokio::test]
async fn request_exceeding_limit_is_rejected() {
    let db = make_db().await;
    // Consume all 3 allowed slots.
    for _ in 0..3 {
        RateLimitStore::check_and_increment(&db, "test:3", 3, 60_000)
            .await
            .unwrap();
    }
    // 4th request exceeds limit.
    let allowed = RateLimitStore::check_and_increment(&db, "test:3", 3, 60_000)
        .await
        .unwrap();
    assert!(!allowed, "4th request should be rejected");
}

#[tokio::test]
async fn window_expiry_resets_counter() {
    let db = make_db().await;
    // Use a 1ms window so it expires almost immediately.
    for _ in 0..3 {
        RateLimitStore::check_and_increment(&db, "test:4", 3, 1)
            .await
            .unwrap();
    }
    // Wait for the window to expire.
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    // After expiry, counter resets and request is allowed again.
    let allowed = RateLimitStore::check_and_increment(&db, "test:4", 3, 1)
        .await
        .unwrap();
    assert!(allowed, "request after window expiry should be allowed");
}

#[tokio::test]
async fn different_keys_are_independent() {
    let db = make_db().await;
    // Exhaust limit for key A.
    for _ in 0..2 {
        RateLimitStore::check_and_increment(&db, "key-a", 2, 60_000)
            .await
            .unwrap();
    }
    // Key B should still be allowed.
    let allowed = RateLimitStore::check_and_increment(&db, "key-b", 2, 60_000)
        .await
        .unwrap();
    assert!(allowed, "key-b should be unaffected by key-a exhaustion");
}

#[tokio::test]
async fn cleanup_removes_expired_entries() {
    let db = make_db().await;
    // Insert an entry with a 1ms window.
    RateLimitStore::check_and_increment(&db, "expire-me", 10, 1)
        .await
        .unwrap();
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    // Cleanup should remove it.
    RateLimitStore::cleanup(&db).await.unwrap();
    // After cleanup, a fresh request for the same key should be allowed (counter reset).
    let allowed = RateLimitStore::check_and_increment(&db, "expire-me", 1, 60_000)
        .await
        .unwrap();
    assert!(allowed, "after cleanup, fresh window should be allowed");
}
