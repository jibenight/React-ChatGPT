import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the @/apiConfig module so buildStreamHeaders does not depend on Vite env.
vi.mock('@/apiConfig', () => ({ API_BASE: 'http://localhost:3000' }));

// We need to control import.meta.env to toggle DEV_BYPASS_AUTH inside the module.
// The module reads import.meta.env at parse-time, so we use vi.resetModules +
// dynamic import to re-evaluate with different env values.

describe('useStreamChat', () => {
  // ---- resolveChatError ----
  describe('resolveChatError', () => {
    let resolveChatError: typeof import('@/hooks/useStreamChat').resolveChatError;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('@/hooks/useStreamChat');
      resolveChatError = mod.resolveChatError;
    });

    it('should return the error message from a standard Error', () => {
      const err = new Error('Something went wrong');
      expect(resolveChatError(err)).toBe('Something went wrong');
    });

    it('should return fallback for empty error message', () => {
      const err = new Error('');
      expect(resolveChatError(err)).toBe('Erreur lors de la requête de chat');
    });

    it('should return a custom fallback when provided', () => {
      const err = new Error('');
      expect(resolveChatError(err, 'Erreur personnalisée')).toBe('Erreur personnalisée');
    });

    it('should return cancellation message for AbortError', () => {
      const err = new DOMException('Aborted', 'AbortError');
      expect(resolveChatError(err)).toBe('Génération annulée.');
    });

    it('should return cancellation message for CanceledError', () => {
      const err = { name: 'CanceledError', message: 'canceled' };
      expect(resolveChatError(err)).toBe('Génération annulée.');
    });

    it('should extract error from response.data.error', () => {
      const err = {
        response: { data: { error: 'bad request from server' } },
        message: 'Request failed',
      };
      expect(resolveChatError(err)).toBe('bad request from server');
    });

    it('should prefer response.data.error over err.message', () => {
      const err = {
        response: { data: { error: 'server-side error' } },
        message: 'generic axios error',
      };
      expect(resolveChatError(err)).toBe('server-side error');
    });

    it('should fall back to err.message if response.data.error is empty', () => {
      const err = {
        response: { data: { error: '' } },
        message: 'network failure',
      };
      expect(resolveChatError(err)).toBe('network failure');
    });

    it('should return fallback when error object has no useful info', () => {
      expect(resolveChatError({})).toBe('Erreur lors de la requête de chat');
      expect(resolveChatError(null)).toBe('Erreur lors de la requête de chat');
      expect(resolveChatError(undefined)).toBe('Erreur lors de la requête de chat');
    });

    it('should extract nested error.message from JSON string in response.data.error', () => {
      const jsonError = JSON.stringify({ error: { message: 'Rate limit exceeded' } });
      const err = {
        response: { data: { error: jsonError } },
      };
      expect(resolveChatError(err)).toBe('Rate limit exceeded');
    });

    it('should handle API key not found pattern', () => {
      const err = new Error('API key not found for openai');
      const result = resolveChatError(err);
      expect(result).toContain('Aucune clé API enregistrée pour openai');
      expect(result).toContain('panneau de gauche');
    });

    it('should truncate long error messages to 350 chars', () => {
      const longMsg = 'a'.repeat(400);
      const err = new Error(longMsg);
      const result = resolveChatError(err);
      expect(result).toHaveLength(350);
      expect(result).toBe('a'.repeat(347) + '...');
    });
  });

  // ---- buildStreamHeaders ----
  describe('buildStreamHeaders', () => {
    let buildStreamHeaders: typeof import('@/hooks/useStreamChat').buildStreamHeaders;

    beforeEach(async () => {
      vi.resetModules();
      // Default: DEV_BYPASS_AUTH is not active
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      });
      const mod = await import('@/hooks/useStreamChat');
      buildStreamHeaders = mod.buildStreamHeaders;
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return Content-Type and Accept headers', () => {
      const headers = buildStreamHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Accept).toBe('text/event-stream');
    });

    it('should include Authorization header when token exists', () => {
      vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
        if (key === 'token') return 'my-jwt-token';
        return null;
      });
      const headers = buildStreamHeaders();
      expect(headers.Authorization).toBe('Bearer my-jwt-token');
    });

    it('should not include Authorization header when no token', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      const headers = buildStreamHeaders();
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
