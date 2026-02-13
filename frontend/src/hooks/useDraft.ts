import { useMemo } from 'react';

type UseDraftOptions = {
  userId: string | number | undefined;
  threadId: string | null;
  sessionId: string;
  projectId: number | null;
};

export function useDraft({ userId, threadId, sessionId, projectId }: UseDraftOptions) {
  const draftKey = useMemo(() => {
    if (!userId) return null;
    const scopeId = threadId || sessionId;
    const scopeProject = projectId ?? 'none';
    return `chat_draft:${userId}:${scopeId}:${scopeProject}`;
  }, [projectId, sessionId, threadId, userId]);

  const initialDraft = useMemo(() => {
    if (!draftKey || typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(draftKey) || '';
    } catch {
      return '';
    }
  }, [draftKey]);

  const clearDraft = () => {
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

  return { draftKey, initialDraft, clearDraft };
}
