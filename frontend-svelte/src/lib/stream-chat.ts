import { i18n } from '$lib/i18n';

export type StreamChatResult = {
  reply: string;
  threadId: string | null;
};

type ChatEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; reply: string; thread_id: string }
  | { type: 'error'; error: string };

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const streamChat = async (
  payload: Record<string, unknown>,
  onDelta: ((delta: string) => void) | undefined,
  _signal: AbortSignal,
): Promise<StreamChatResult> => {
  if (!isTauri) {
    throw new Error(i18n.t('tauriNotAvailable'));
  }

  const { invoke, Channel } = await import('@tauri-apps/api/core');

  let finalReply = '';
  let finalThreadId: string | null = null;

  const channel = new Channel<ChatEvent>();
  channel.onmessage = (event: ChatEvent) => {
    if (event.type === 'delta') {
      finalReply += event.content;
      onDelta?.(event.content);
    }
    if (event.type === 'done') {
      finalReply = event.reply;
      finalThreadId = event.thread_id;
    }
    if (event.type === 'error') {
      throw new Error(event.error);
    }
  };

  const result = await invoke<{ reply: string; thread_id: string }>(
    'send_message',
    {
      input: {
        thread_id: payload.threadId || null,
        session_id: payload.sessionId || null,
        message: payload.message || null,
        provider: payload.provider || 'openai',
        model: payload.model || null,
        project_id: payload.projectId || null,
        attachments: payload.attachments || [],
      },
      onEvent: channel,
    },
  );

  if (!finalThreadId && result?.thread_id) {
    finalThreadId = result.thread_id;
  }
  if (!finalReply && result?.reply) {
    finalReply = result.reply;
  }

  return { reply: finalReply, threadId: finalThreadId };
};

export const resolveChatError = (
  err: any,
  fallback?: string,
): string => {
  if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
    return i18n.t('generationCancelled');
  }
  const message = typeof err === 'string' ? err : err?.message;
  if (typeof message === 'string' && message.trim()) {
    const missingKeyMatch = message.match(
      /Aucune cle API configuree pour ([a-z0-9_-]+)/i,
    );
    if (missingKeyMatch?.[1]) {
      return i18n.t('noApiKeyForProvider', { provider: missingKeyMatch[1] });
    }
    return message.length > 350 ? `${message.slice(0, 347)}...` : message;
  }
  return fallback ?? i18n.t('chatRequestError');
};
