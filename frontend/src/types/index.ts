export type ProviderName = 'openai' | 'gemini' | 'claude' | 'mistral' | 'groq';

export interface User {
  id: number;
  userId: number;
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
}

export interface Thread {
  id: string;
  title: string;
  user_id: number;
  project_id?: number | null;
  last_message_at?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  context_data?: string;
  user_id: number;
}

export interface Attachment {
  id?: string;
  type?: string;
  name?: string;
  mimeType?: string;
  dataUrl?: string;
  fileUri?: string;
  size?: number;
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
