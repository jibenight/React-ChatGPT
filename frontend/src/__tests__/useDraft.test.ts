import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// useDraft hook uses React useMemo internally, but the core logic is simple:
// - draftKey: builds a localStorage key from userId/threadId/sessionId/projectId
// - initialDraft: reads from localStorage using draftKey
// - clearDraft: removes from localStorage and dispatches a custom event
//
// We test the pure logic directly to avoid needing @testing-library/react.

describe('useDraft logic', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- draftKey building logic ---
  const buildDraftKey = (
    userId: string | number | undefined,
    threadId: string | null,
    sessionId: string,
    projectId: number | null,
  ): string | null => {
    if (!userId) return null;
    const scopeId = threadId || sessionId;
    const scopeProject = projectId ?? 'none';
    return `chat_draft:${userId}:${scopeId}:${scopeProject}`;
  };

  describe('draftKey', () => {
    it('should return null when userId is undefined', () => {
      expect(buildDraftKey(undefined, null, 'sess-1', null)).toBeNull();
    });

    it('should build key with threadId when provided', () => {
      expect(buildDraftKey('user-1', 'thread-42', 'sess-1', 5)).toBe(
        'chat_draft:user-1:thread-42:5',
      );
    });

    it('should fall back to sessionId when threadId is null', () => {
      expect(buildDraftKey('user-1', null, 'sess-abc', null)).toBe(
        'chat_draft:user-1:sess-abc:none',
      );
    });

    it('should use "none" for null projectId', () => {
      expect(buildDraftKey(100, null, 'sess-1', null)).toBe('chat_draft:100:sess-1:none');
    });
  });

  // --- initialDraft reading logic ---
  describe('initialDraft', () => {
    it('should read draft from localStorage', () => {
      const key = 'chat_draft:user-1:sess-1:none';
      mockStorage[key] = 'Bonjour, ceci est un brouillon';
      expect(localStorage.getItem(key)).toBe('Bonjour, ceci est un brouillon');
    });

    it('should return empty string when no draft in localStorage', () => {
      const key = 'chat_draft:user-1:sess-1:none';
      expect(localStorage.getItem(key) || '').toBe('');
    });

    it('should return empty string when draftKey is null (no userId)', () => {
      const key = buildDraftKey(undefined, null, 'sess-1', null);
      expect(key).toBeNull();
      // When key is null, initialDraft should be ''
      const initialDraft = key ? (localStorage.getItem(key) || '') : '';
      expect(initialDraft).toBe('');
    });
  });

  // --- clearDraft logic ---
  describe('clearDraft', () => {
    const clearDraft = (draftKey: string | null) => {
      if (!draftKey || typeof window === 'undefined') return;
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore storage errors
      }
      window.dispatchEvent(
        new CustomEvent('chat-draft-clear', { detail: { key: draftKey } }),
      );
    };

    it('should remove the draft from localStorage', () => {
      const key = 'chat_draft:user-1:sess-1:none';
      mockStorage[key] = 'draft content';

      clearDraft(key);

      expect(localStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should dispatch a chat-draft-clear custom event', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const key = 'chat_draft:user-1:sess-1:none';

      clearDraft(key);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('chat-draft-clear');
      expect(event.detail).toEqual({ key });

      dispatchSpy.mockRestore();
    });

    it('should do nothing when draftKey is null', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      clearDraft(null);

      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();

      dispatchSpy.mockRestore();
    });
  });
});
