import { invoke } from '@tauri-apps/api/core';

// ── User ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getUser = () => invoke<any>('get_user');

export const updateUsername = (username: string) =>
  invoke('update_username', { input: { username } });

export const saveApiKey = (provider: string, apiKey: string) =>
  invoke('save_api_key', { input: { provider, api_key: apiKey } });

export const listApiKeys = () =>
  invoke<{ providers: string[] }>('list_api_keys');

export const deleteApiKey = (provider: string) =>
  invoke('delete_api_key', { provider });

// ── Projects ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listProjects = () => invoke<any[]>('list_projects');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getProject = (projectId: number) =>
  invoke<any>('get_project', { projectId });

export const createProject = (input: {
  name: string;
  description?: string;
  instructions?: string;
  context_data?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) => invoke<any>('create_project', { input });

export const updateProject = (
  projectId: number,
  input: {
    name?: string;
    description?: string;
    instructions?: string;
    context_data?: string;
  },
) => invoke('update_project', { projectId, input });

export const deleteProject = (projectId: number) =>
  invoke('delete_project', { projectId });

// ── Threads ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listThreads = (projectId?: number | null) =>
  invoke<any[]>('list_threads', { projectId: projectId ?? null });

export const createThread = (input: {
  id?: string;
  title?: string | null;
  project_id?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) => invoke<any>('create_thread', { input });

export const updateThread = (
  threadId: string,
  input: { title?: string; project_id?: number | null },
) => invoke('update_thread', { threadId, input });

export const deleteThread = (threadId: string) =>
  invoke('delete_thread', { threadId });

export const getThreadMessages = (
  threadId: string,
  limit?: number,
  beforeId?: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) =>
  invoke<any[]>('get_thread_messages', {
    threadId,
    limit: limit ?? 50,
    beforeId: beforeId ?? null,
  });

export const exportThread = (threadId: string, format: 'md' | 'json') =>
  invoke<{ filename: string; content: string; mime_type: string }>(
    'export_thread',
    { threadId, format },
  );

// ── Search ──
export const searchMessages = (
  query: string,
  limit?: number,
  offset?: number,
) =>
  invoke<{
    results: Array<{
      id: number;
      thread_id: string;
      thread_title: string | null;
      role: string;
      content: string;
      provider: string | null;
      created_at: string | null;
      snippet: string;
    }>;
    total: number;
  }>('search_messages', {
    query,
    limit: limit ?? 20,
    offset: offset ?? 0,
  });
