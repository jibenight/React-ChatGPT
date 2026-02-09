export type AssistantMessageUiStatus =
  | 'thinking'
  | 'streaming'
  | 'done'
  | 'error'
  | 'cancelled';

export type AssistantMessageUiMeta = {
  status: AssistantMessageUiStatus;
  attempt: number;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
  payload: Record<string, unknown> | null;
  threadId: string;
};

export type AssistantMessageUiMetaById = Record<string, AssistantMessageUiMeta>;

type MessageSnapshot = {
  id: string;
  role: string;
  createdAt?: Date;
};

type StartAssistantMessageUiMetaInput = {
  messageId: string;
  threadId: string;
  attempt: number;
  payload?: Record<string, unknown> | null;
};

type CompleteAssistantMessageUiMetaInput = {
  messageId: string;
  status: 'done' | 'error' | 'cancelled';
  error?: string | null;
};

const buildDoneMetaFromMessage = (
  message: MessageSnapshot,
  fallbackThreadId: string,
): AssistantMessageUiMeta => {
  const createdAt =
    message.createdAt instanceof Date
      ? message.createdAt.getTime()
      : Date.now();
  return {
    status: 'done',
    attempt: 1,
    startedAt: createdAt,
    finishedAt: createdAt,
    error: null,
    payload: null,
    threadId: fallbackThreadId,
  };
};

export const syncAssistantMessageUiMeta = (
  prev: AssistantMessageUiMetaById,
  messages: MessageSnapshot[],
  fallbackThreadId: string,
): AssistantMessageUiMetaById => {
  const next: AssistantMessageUiMetaById = {};
  let changed = false;

  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    const existing = prev[message.id];
    if (existing) {
      next[message.id] = existing;
      continue;
    }
    changed = true;
    next[message.id] = buildDoneMetaFromMessage(message, fallbackThreadId);
  }

  if (!changed) {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) {
      changed = true;
    } else {
      for (const key of prevKeys) {
        if (!next[key]) {
          changed = true;
          break;
        }
      }
    }
  }

  return changed ? next : prev;
};

export const startAssistantMessageUiMeta = (
  prev: AssistantMessageUiMetaById,
  input: StartAssistantMessageUiMetaInput,
): AssistantMessageUiMetaById => ({
  ...prev,
  [input.messageId]: {
    status: 'thinking',
    attempt: input.attempt,
    startedAt: Date.now(),
    finishedAt: null,
    error: null,
    payload: input.payload || null,
    threadId: input.threadId,
  },
});

export const markAssistantMessageStreaming = (
  prev: AssistantMessageUiMetaById,
  messageId: string,
): AssistantMessageUiMetaById => {
  const current = prev[messageId];
  if (!current || current.status === 'streaming') return prev;
  return {
    ...prev,
    [messageId]: {
      ...current,
      status: 'streaming',
    },
  };
};

export const updateAssistantMessagePayload = (
  prev: AssistantMessageUiMetaById,
  messageId: string,
  payload: Record<string, unknown>,
): AssistantMessageUiMetaById => {
  const current = prev[messageId];
  if (!current) return prev;
  return {
    ...prev,
    [messageId]: {
      ...current,
      payload,
    },
  };
};

export const completeAssistantMessageUiMeta = (
  prev: AssistantMessageUiMetaById,
  input: CompleteAssistantMessageUiMetaInput,
): AssistantMessageUiMetaById => {
  const current = prev[input.messageId];
  if (!current) return prev;
  return {
    ...prev,
    [input.messageId]: {
      ...current,
      status: input.status,
      finishedAt: Date.now(),
      error:
        input.status === 'error' || input.status === 'cancelled'
          ? input.error || null
          : null,
    },
  };
};
