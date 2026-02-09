import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageActions } from '@/components/assistant-ui/message-actions';
import type { AssistantMessageUiMeta } from '@/features/chat/chatUxState';

const baseMeta: AssistantMessageUiMeta = {
  status: 'error',
  attempt: 1,
  startedAt: 1000,
  finishedAt: 2000,
  error: 'Erreur réseau',
  payload: { message: 'Bonjour' },
  threadId: 'thread-1',
};

describe('MessageActions', () => {
  it('renders retry action for retryable error states', () => {
    const onRetry = vi.fn();
    render(
      <MessageActions
        meta={baseMeta}
        canRetry
        isRetrying={false}
        onRetry={onRetry}
      />,
    );

    const button = screen.getByRole('button', { name: 'Réessayer' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows retrying label while retry is in progress', () => {
    render(
      <MessageActions
        meta={baseMeta}
        canRetry
        isRetrying
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Nouvelle tentative...' }),
    ).toBeDisabled();
  });

  it('does not render actions for non-retryable states', () => {
    render(
      <MessageActions
        meta={{ ...baseMeta, status: 'done' }}
        canRetry={false}
        isRetrying={false}
        onRetry={() => {}}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

