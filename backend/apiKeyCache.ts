const cache = new Map<string, { key: string; expiresAt: number }>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const buildCacheKey = (userId: string, provider: string): string =>
  `${userId}:${provider}`;

const getFromCache = (userId: string, provider: string): string | null => {
  const entry = cache.get(buildCacheKey(userId, provider));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(buildCacheKey(userId, provider));
    return null;
  }
  return entry.key;
};

const setInCache = (
  userId: string,
  provider: string,
  decryptedKey: string,
  ttlMs: number = 300000,
): void => {
  cache.set(buildCacheKey(userId, provider), {
    key: decryptedKey,
    expiresAt: Date.now() + ttlMs,
  });
};

const invalidateCache = (userId: string, provider?: string): void => {
  if (provider) {
    cache.delete(buildCacheKey(userId, provider));
  } else {
    const prefix = `${userId}:`;
    for (const cacheKey of cache.keys()) {
      if (cacheKey.startsWith(prefix)) {
        cache.delete(cacheKey);
      }
    }
  }
};

const clearExpired = (): void => {
  const now = Date.now();
  for (const [cacheKey, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(cacheKey);
    }
  }
};

setInterval(clearExpired, CLEANUP_INTERVAL_MS);

module.exports = { getFromCache, setInCache, invalidateCache };
