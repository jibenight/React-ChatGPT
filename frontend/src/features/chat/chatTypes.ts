export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  attachments?: Array<{
    id: string;
    type: string;
    name: string;
    contentType: string;
    status: { type: string };
    content: unknown[];
    file?: File;
  }>;
  createdAt: Date;
};

export type FailedRequest = {
  payload: Record<string, unknown>;
  threadId: string;
};
