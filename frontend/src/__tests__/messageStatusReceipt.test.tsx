import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageStatus } from '@/components/assistant-ui/message-status';
import { MessageReceipt } from '@/components/assistant-ui/message-receipt';
import type { AssistantMessageUiMeta } from '@/features/chat/chatUxState';

const baseMeta: AssistantMessageUiMeta = {
  status: 'done',
  attempt: 2,
  startedAt: new Date('2026-02-09T09:00:00.000Z').getTime(),
  finishedAt: new Date('2026-02-09T09:00:03.000Z').getTime(),
  error: null,
  payload: null,
  threadId: 'thread-1',
};

describe('MessageStatus', () => {
  it('renders done label with duration and attempt', () => {
    render(<MessageStatus meta={baseMeta} />);

    expect(screen.getByText('Réponse terminée')).toBeInTheDocument();
    expect(screen.getByText(/tentative 2/)).toBeInTheDocument();
    expect(screen.getByText(/3s/)).toBeInTheDocument();
  });

  it('renders streaming label for running state', () => {
    render(
      <MessageStatus
        meta={{ ...baseMeta, status: 'streaming', finishedAt: null }}
      />,
    );

    expect(screen.getByText('Réponse en cours')).toBeInTheDocument();
  });
});

describe('MessageReceipt', () => {
  it('renders receipt for done state only', () => {
    render(<MessageReceipt meta={baseMeta} />);
    expect(screen.getByText('Reçu')).toBeInTheDocument();
    expect(screen.getByText(/Réponse générée à/)).toBeInTheDocument();
    expect(screen.getByText(/tentative 2/)).toBeInTheDocument();
  });

  it('returns null for non-done status', () => {
    render(<MessageReceipt meta={{ ...baseMeta, status: 'error' }} />);
    expect(screen.queryByText('Reçu')).not.toBeInTheDocument();
  });
});

