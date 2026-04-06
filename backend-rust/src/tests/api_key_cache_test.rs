use crate::services::ApiKeyCache;
use std::sync::Arc;
use std::time::Duration;

#[test]
fn set_and_get_returns_value() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-test-key".to_string(), Duration::from_secs(60));
    assert_eq!(cache.get(1, "openai"), Some("sk-test-key".to_string()));
}

#[test]
fn get_missing_key_returns_none() {
    let cache = ApiKeyCache::new();
    assert_eq!(cache.get(42, "openai"), None);
}

#[test]
fn get_wrong_provider_returns_none() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-openai".to_string(), Duration::from_secs(60));
    assert_eq!(cache.get(1, "gemini"), None);
}

#[test]
fn ttl_expiry_returns_none() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-expired".to_string(), Duration::from_nanos(1));
    std::thread::sleep(Duration::from_millis(10));
    assert_eq!(cache.get(1, "openai"), None);
}

#[test]
fn invalidate_specific_provider() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-openai".to_string(), Duration::from_secs(60));
    cache.set(1, "gemini", "sk-gemini".to_string(), Duration::from_secs(60));
    cache.invalidate(1, Some("openai"));
    assert_eq!(cache.get(1, "openai"), None);
    assert_eq!(cache.get(1, "gemini"), Some("sk-gemini".to_string()));
}

#[test]
fn invalidate_all_clears_user_entries() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-openai".to_string(), Duration::from_secs(60));
    cache.set(1, "gemini", "sk-gemini".to_string(), Duration::from_secs(60));
    cache.set(1, "claude", "sk-claude".to_string(), Duration::from_secs(60));
    cache.invalidate(1, None);
    assert_eq!(cache.get(1, "openai"), None);
    assert_eq!(cache.get(1, "gemini"), None);
    assert_eq!(cache.get(1, "claude"), None);
}

#[test]
fn invalidate_all_does_not_affect_other_users() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-user1".to_string(), Duration::from_secs(60));
    cache.set(2, "openai", "sk-user2".to_string(), Duration::from_secs(60));
    cache.invalidate(1, None);
    assert_eq!(cache.get(1, "openai"), None);
    assert_eq!(cache.get(2, "openai"), Some("sk-user2".to_string()));
}

#[test]
fn cleanup_removes_expired_entries() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-expired".to_string(), Duration::from_nanos(1));
    cache.set(2, "gemini", "sk-valid".to_string(), Duration::from_secs(60));
    std::thread::sleep(Duration::from_millis(10));
    cache.cleanup();
    assert_eq!(cache.get(1, "openai"), None);
    assert_eq!(cache.get(2, "gemini"), Some("sk-valid".to_string()));
}

#[test]
fn concurrent_access_is_safe() {
    use std::thread;

    let cache = Arc::new(ApiKeyCache::new());
    let mut handles = vec![];

    // Write from 10 threads.
    for i in 0..10u64 {
        let c = Arc::clone(&cache);
        handles.push(thread::spawn(move || {
            c.set(i as i64, "openai", format!("sk-{}", i), Duration::from_secs(60));
        }));
    }
    for h in handles {
        h.join().unwrap();
    }

    // All 10 entries should be readable.
    for i in 0..10i64 {
        assert!(cache.get(i, "openai").is_some(), "entry {} missing", i);
    }
}

#[test]
fn overwrite_updates_value() {
    let cache = ApiKeyCache::new();
    cache.set(1, "openai", "sk-old".to_string(), Duration::from_secs(60));
    cache.set(1, "openai", "sk-new".to_string(), Duration::from_secs(60));
    assert_eq!(cache.get(1, "openai"), Some("sk-new".to_string()));
}
