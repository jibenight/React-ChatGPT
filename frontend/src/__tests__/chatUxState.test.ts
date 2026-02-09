import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeAssistantMessageUiMeta,
  markAssistantMessageStreaming,
  startAssistantMessageUiMeta,
  syncAssistantMessageUiMeta,
  updateAssistantMessagePayload,
} from '../features/chat/chatUxState';

const NOW = new Date('2026-02-09T10:00:00.000Z');

describe('chatUxState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs assistant messages from history with done status', () => {
    const result = syncAssistantMessageUiMeta(
      {},
      [
        { id: 'u1', role: 'user', createdAt: NOW },
        { id: 'a1', role: 'assistant', createdAt: NOW },
      ],
      'thread-1',
    );

    expect(Object.keys(result)).toEqual(['a1']);
    expect(result.a1.status).toBe('done');
    expect(result.a1.threadId).toBe('thread-1');
    expect(result.a1.startedAt).toBe(NOW.getTime());
    expect(result.a1.finishedAt).toBe(NOW.getTime());
  });

  it('returns the same reference when sync does not change the state', () => {
    const prev = {
      a1: {
        status: 'done' as const,
        attempt: 1,
        startedAt: NOW.getTime(),
        finishedAt: NOW.getTime(),
        error: null,
        payload: null,
        threadId: 'thread-1',
      },
    };

    const next = syncAssistantMessageUiMeta(
      prev,
      [{ id: 'a1', role: 'assistant', createdAt: NOW }],
      'thread-1',
    );

    expect(next).toBe(prev);
  });

  it('tracks lifecycle transitions from thinking to streaming to done', () => {
    const started = startAssistantMessageUiMeta({}, {
      messageId: 'a1',
      threadId: 'thread-1',
      attempt: 2,
    });
    expect(started.a1.status).toBe('thinking');
    expect(started.a1.attempt).toBe(2);

    const withPayload = updateAssistantMessagePayload(started, 'a1', {
      message: 'Bonjour',
    });
    expect(withPayload.a1.payload).toEqual({ message: 'Bonjour' });

    const streaming = markAssistantMessageStreaming(withPayload, 'a1');
    expect(streaming.a1.status).toBe('streaming');

    const done = completeAssistantMessageUiMeta(streaming, {
      messageId: 'a1',
      status: 'done',
    });
    expect(done.a1.status).toBe('done');
    expect(done.a1.error).toBeNull();
    expect(done.a1.finishedAt).toBe(NOW.getTime());
  });

  it('stores terminal error status and message', () => {
    const started = startAssistantMessageUiMeta({}, {
      messageId: 'a1',
      threadId: 'thread-1',
      attempt: 1,
    });

    const failed = completeAssistantMessageUiMeta(started, {
      messageId: 'a1',
      status: 'error',
      error: 'Timeout réseau',
    });

    expect(failed.a1.status).toBe('error');
    expect(failed.a1.error).toBe('Timeout réseau');
  });
});
