import { API_BASE } from '@/apiConfig';

const DEV_BYPASS_AUTH =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';

export const buildStreamHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (DEV_BYPASS_AUTH) {
    const stored = localStorage.getItem('dev_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        headers['X-Dev-User-Id'] = user.id;
        headers['X-Dev-User-Name'] = user.username;
        headers['X-Dev-User-Email'] = user.email;
      } catch {
        // ignore invalid storage
      }
    }
  }
  return headers;
};

export type StreamChatResult = {
  reply: string;
  threadId: string | null;
};

export const streamChat = async (
  payload: Record<string, unknown>,
  onDelta: ((delta: string) => void) | undefined,
  signal: AbortSignal,
): Promise<StreamChatResult> => {
  const response = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: buildStreamHeaders(),
    body: JSON.stringify(payload),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data?.error || 'Erreur lors de la requ\u00eate de chat');
    } catch {
      throw new Error(text || 'Erreur lors de la requ\u00eate de chat');
    }
  }

  if (!response.body) {
    throw new Error('Streaming non support\u00e9 par le navigateur');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalReply = '';
  let finalThreadId: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part
        .split('\n')
        .find(entry => entry.trim().startsWith('data:'));
      if (!line) continue;
      const json = line.replace(/^data:\s*/, '').trim();
      if (!json) continue;
      let event;
      try {
        event = JSON.parse(json);
      } catch {
        continue;
      }

      if (event.type === 'delta' && typeof event.content === 'string') {
        finalReply += event.content;
        onDelta?.(event.content);
      }

      if (event.type === 'error') {
        throw new Error(event.error || 'Erreur lors du streaming');
      }

      if (event.type === 'done') {
        if (typeof event.reply === 'string') {
          finalReply = event.reply;
        }
        finalThreadId = event.threadId || null;
      }
    }
  }

  return { reply: finalReply, threadId: finalThreadId };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveChatError = (
  err: any,
  fallback = 'Erreur lors de la requ\u00eate de chat',
): string => {
  const formatMessage = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    let message = value.trim();
    if (!message) return null;

    if (message.startsWith('{') && message.endsWith('}')) {
      try {
        const parsed = JSON.parse(message);
        const parsedMessage = parsed?.error?.message;
        if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
          message = parsedMessage;
        }
      } catch {
        // Keep original text when not valid JSON.
      }
    }

    message = message
      .split('\n')
      .map(part => part.trim())
      .filter(Boolean)
      .join(' ');

    const missingKeyMatch = message.match(
      /API key not found for ([a-z0-9_-]+)/i,
    );
    if (missingKeyMatch?.[1]) {
      return `Aucune cl\u00e9 API enregistr\u00e9e pour ${missingKeyMatch[1]}. S\u00e9lectionnez un fournisseur configur\u00e9 dans le panneau de gauche.`;
    }

    return message.length > 350 ? `${message.slice(0, 347)}...` : message;
  };

  if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
    return 'G\u00e9n\u00e9ration annul\u00e9e.';
  }
  const responseError = formatMessage(err?.response?.data?.error);
  if (responseError) return responseError;
  const message = formatMessage(err?.message);
  if (message) return message;
  return fallback;
};
