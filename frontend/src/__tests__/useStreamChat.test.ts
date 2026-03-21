import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useStreamChat', () => {
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

    it('should handle string errors directly', () => {
      expect(resolveChatError('Something broke')).toBe('Something broke');
    });

    it('should return fallback when error object has no useful info', () => {
      expect(resolveChatError({})).toBe('Erreur lors de la requête de chat');
      expect(resolveChatError(null)).toBe('Erreur lors de la requête de chat');
      expect(resolveChatError(undefined)).toBe('Erreur lors de la requête de chat');
    });

    it('should handle missing API key pattern', () => {
      const err = new Error('Aucune clé API configurée pour openai');
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
});
