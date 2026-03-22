export type ProviderName = 'openai' | 'gemini' | 'claude' | 'mistral' | 'groq' | 'local';

export interface User {
  id: number;
  userId?: number;
  username: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  attachments?: Attachment[];
  created_at?: string;
  createdAt?: Date;
}

export interface Thread {
  id: string;
  title: string;
  user_id?: number;
  project_id?: number | null;
  last_message_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: number | string;
  name: string;
  description?: string;
  instructions?: string;
  context_data?: string;
  user_id?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attachment {
  id?: string;
  type?: string;
  name?: string;
  mimeType?: string;
  contentType?: string;
  dataUrl?: string;
  fileUri?: string;
  size?: number;
  file?: File;
  content?: any[];
  status?: { type: string; reason?: string };
}

export interface ApiKeyInfo {
  provider: ProviderName;
  hasKey: boolean;
}

export interface SSEEvent {
  type: 'delta' | 'done' | 'error';
  content?: string;
  threadId?: string;
  error?: string;
}

export interface ProviderOption {
  provider: ProviderName;
  model: string;
  name?: string;
  avatar?: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface FailedRequest {
  payload: Record<string, unknown>;
  threadId: string;
}
