import { invoke, Channel } from '@tauri-apps/api/core';

export type StreamChatResult = {
  reply: string;
  threadId: string | null;
};

type ChatEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; reply: string; thread_id: string }
  | { type: 'error'; error: string };

export const streamChat = async (
  payload: Record<string, unknown>,
  onDelta: ((delta: string) => void) | undefined,
  _signal: AbortSignal,
): Promise<StreamChatResult> => {
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

  // Use the returned result if channel didn't capture final state
  if (!finalThreadId && result?.thread_id) {
    finalThreadId = result.thread_id;
  }
  if (!finalReply && result?.reply) {
    finalReply = result.reply;
  }

  return { reply: finalReply, threadId: finalThreadId };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveChatError = (
  err: any,
  fallback = 'Erreur lors de la requête de chat',
): string => {
  if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
    return 'Génération annulée.';
  }
  const message = typeof err === 'string' ? err : err?.message;
  if (typeof message === 'string' && message.trim()) {
    const missingKeyMatch = message.match(
      /Aucune clé API configurée pour ([a-z0-9_-]+)/i,
    );
    if (missingKeyMatch?.[1]) {
      return `Aucune clé API enregistrée pour ${missingKeyMatch[1]}. Sélectionnez un fournisseur configuré dans le panneau de gauche.`;
    }
    return message.length > 350 ? `${message.slice(0, 347)}...` : message;
  }
  return fallback;
};
