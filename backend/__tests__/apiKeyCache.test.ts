import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The module uses a module-level setInterval. We need fake timers BEFORE
// the module is loaded, otherwise the real timer fires in the background.
// Vitest's vi.mock + factory is hoisted, but the setInterval call happens at
// import-time, so we enable fake timers early.

describe('apiKeyCache', () => {
  let getFromCache: (userId: string, provider: string) => string | null;
  let setInCache: (userId: string, provider: string, key: string, ttlMs?: number) => void;
  let invalidateCache: (userId: string, provider?: string) => void;

  beforeEach(async () => {
    vi.useFakeTimers();
    // Reset module registry so each test gets a fresh cache Map.
    vi.resetModules();
    const mod = await import('../apiKeyCache');
    getFromCache = (mod as any).getFromCache;
    setInCache = (mod as any).setInCache;
    invalidateCache = (mod as any).invalidateCache;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setInCache + getFromCache', () => {
    it('should store and retrieve a key', () => {
      setInCache('user1', 'openai', 'sk-test-123');
      expect(getFromCache('user1', 'openai')).toBe('sk-test-123');
    });

    it('should return null for missing entry', () => {
      expect(getFromCache('user1', 'openai')).toBeNull();
    });

    it('should store multiple providers per user', () => {
      setInCache('user1', 'openai', 'sk-openai');
      setInCache('user1', 'gemini', 'ai-gemini');
      expect(getFromCache('user1', 'openai')).toBe('sk-openai');
      expect(getFromCache('user1', 'gemini')).toBe('ai-gemini');
    });

    it('should store keys for different users independently', () => {
      setInCache('user1', 'openai', 'key-user1');
      setInCache('user2', 'openai', 'key-user2');
      expect(getFromCache('user1', 'openai')).toBe('key-user1');
      expect(getFromCache('user2', 'openai')).toBe('key-user2');
    });
  });

  describe('TTL expiration', () => {
    it('should return null after TTL expires', () => {
      setInCache('user1', 'openai', 'sk-test', 5000);
      expect(getFromCache('user1', 'openai')).toBe('sk-test');

      // Advance time past TTL
      vi.advanceTimersByTime(5001);
      expect(getFromCache('user1', 'openai')).toBeNull();
    });

    it('should still return key before TTL expires', () => {
      setInCache('user1', 'openai', 'sk-test', 10000);

      vi.advanceTimersByTime(9999);
      expect(getFromCache('user1', 'openai')).toBe('sk-test');
    });

    it('should use default TTL of 300000ms (5 minutes)', () => {
      setInCache('user1', 'openai', 'sk-test');

      vi.advanceTimersByTime(299999);
      expect(getFromCache('user1', 'openai')).toBe('sk-test');

      vi.advanceTimersByTime(2);
      expect(getFromCache('user1', 'openai')).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate a specific provider for a user', () => {
      setInCache('user1', 'openai', 'sk-openai');
      setInCache('user1', 'gemini', 'ai-gemini');

      invalidateCache('user1', 'openai');

      expect(getFromCache('user1', 'openai')).toBeNull();
      expect(getFromCache('user1', 'gemini')).toBe('ai-gemini');
    });

    it('should invalidate all providers for a user when no provider specified', () => {
      setInCache('user1', 'openai', 'sk-openai');
      setInCache('user1', 'gemini', 'ai-gemini');
      setInCache('user1', 'claude', 'cl-claude');

      invalidateCache('user1');

      expect(getFromCache('user1', 'openai')).toBeNull();
      expect(getFromCache('user1', 'gemini')).toBeNull();
      expect(getFromCache('user1', 'claude')).toBeNull();
    });

    it('should not affect other users when invalidating', () => {
      setInCache('user1', 'openai', 'key1');
      setInCache('user2', 'openai', 'key2');

      invalidateCache('user1');

      expect(getFromCache('user1', 'openai')).toBeNull();
      expect(getFromCache('user2', 'openai')).toBe('key2');
    });
  });

  describe('clearExpired (via setInterval)', () => {
    it('should automatically clean expired entries every 10 minutes', () => {
      setInCache('user1', 'openai', 'sk-test', 5000);
      setInCache('user2', 'gemini', 'ai-test', 900000); // 15 min TTL

      // Advance 5001ms so user1 entry expires but not user2
      vi.advanceTimersByTime(5001);

      // Now advance to trigger the cleanup interval (10 minutes from module load)
      // The total elapsed is 5001ms, so we need 10*60*1000 - 5001 more
      vi.advanceTimersByTime(10 * 60 * 1000 - 5001);

      // After cleanup, user1's expired entry is cleaned
      // user2 still has 15min TTL, so still valid at ~10min
      expect(getFromCache('user1', 'openai')).toBeNull();
      expect(getFromCache('user2', 'gemini')).toBe('ai-test');
    });
  });
});
