import React from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread';
import MessageListSkeleton from '@/components/ui/MessageListSkeleton';

type ChatMessageListProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
  loadingHistory: boolean;
  hasMoreHistory: boolean;
  loadingMoreHistory: boolean;
  loadMoreHistory: () => void;
  draftKey: string | null;
  initialDraft: string;
  searchQuery: string;
  scrollToIndex: number | null;
};

function ChatMessageList({
  runtime,
  loadingHistory,
  hasMoreHistory,
  loadingMoreHistory,
  loadMoreHistory,
  draftKey,
  initialDraft,
  searchQuery,
  scrollToIndex,
}: ChatMessageListProps) {
  if (loadingHistory) {
    return (
      <div className='flex-1 min-h-0'>
        <MessageListSkeleton />
      </div>
    );
  }

  return (
    <div className='flex-1 min-h-0'>
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread
          draftKey={draftKey}
          initialDraft={initialDraft}
          searchQuery={searchQuery}
          scrollToIndex={scrollToIndex}
          hasMoreHistory={hasMoreHistory}
          loadingMoreHistory={loadingMoreHistory}
          loadMoreHistory={loadMoreHistory}
        />
      </AssistantRuntimeProvider>
    </div>
  );
}

export default ChatMessageList;
