use dashmap::DashMap;
use std::time::{Duration, Instant};

struct CacheEntry {
    key: String,
    expires_at: Instant,
}

pub struct ApiKeyCache {
    map: DashMap<String, CacheEntry>,
}

impl ApiKeyCache {
    pub fn new() -> Self {
        ApiKeyCache {
            map: DashMap::new(),
        }
    }

    fn cache_key(user_id: i64, provider: &str) -> String {
        format!("{}:{}", user_id, provider)
    }

    pub fn get(&self, user_id: i64, provider: &str) -> Option<String> {
        let k = Self::cache_key(user_id, provider);
        let entry = self.map.get(&k)?;
        if entry.expires_at <= Instant::now() {
            drop(entry);
            self.map.remove(&k);
            return None;
        }
        Some(entry.key.clone())
    }

    pub fn set(&self, user_id: i64, provider: &str, key: String, ttl: Duration) {
        let k = Self::cache_key(user_id, provider);
        self.map.insert(
            k,
            CacheEntry {
                key,
                expires_at: Instant::now() + ttl,
            },
        );
    }

    pub fn invalidate(&self, user_id: i64, provider: Option<&str>) {
        match provider {
            Some(p) => {
                self.map.remove(&Self::cache_key(user_id, p));
            }
            None => {
                self.map.retain(|k, _| !k.starts_with(&format!("{}:", user_id)));
            }
        }
    }

    pub fn cleanup(&self) {
        let now = Instant::now();
        self.map.retain(|_, v| v.expires_at > now);
    }
}

impl Default for ApiKeyCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_get() {
        let cache = ApiKeyCache::new();
        cache.set(1, "openai", "sk-test".to_string(), Duration::from_secs(60));
        assert_eq!(cache.get(1, "openai"), Some("sk-test".to_string()));
    }

    #[test]
    fn test_get_missing_returns_none() {
        let cache = ApiKeyCache::new();
        assert_eq!(cache.get(99, "openai"), None);
    }

    #[test]
    fn test_ttl_expiry() {
        let cache = ApiKeyCache::new();
        cache.set(1, "openai", "sk-expired".to_string(), Duration::from_nanos(1));
        // Sleep just enough for the TTL to expire
        std::thread::sleep(Duration::from_millis(5));
        assert_eq!(cache.get(1, "openai"), None);
    }

    #[test]
    fn test_invalidate_specific_provider() {
        let cache = ApiKeyCache::new();
        cache.set(1, "openai", "sk-openai".to_string(), Duration::from_secs(60));
        cache.set(1, "gemini", "sk-gemini".to_string(), Duration::from_secs(60));
        cache.invalidate(1, Some("openai"));
        assert_eq!(cache.get(1, "openai"), None);
        assert_eq!(cache.get(1, "gemini"), Some("sk-gemini".to_string()));
    }

    #[test]
    fn test_invalidate_all_providers() {
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
    fn test_invalidate_all_does_not_affect_other_users() {
        let cache = ApiKeyCache::new();
        cache.set(1, "openai", "sk-user1".to_string(), Duration::from_secs(60));
        cache.set(2, "openai", "sk-user2".to_string(), Duration::from_secs(60));
        cache.invalidate(1, None);
        assert_eq!(cache.get(1, "openai"), None);
        assert_eq!(cache.get(2, "openai"), Some("sk-user2".to_string()));
    }

    #[test]
    fn test_cleanup_removes_expired() {
        let cache = ApiKeyCache::new();
        cache.set(1, "openai", "sk-expired".to_string(), Duration::from_nanos(1));
        cache.set(2, "openai", "sk-valid".to_string(), Duration::from_secs(60));
        std::thread::sleep(Duration::from_millis(5));
        cache.cleanup();
        assert_eq!(cache.map.len(), 1);
    }
}
