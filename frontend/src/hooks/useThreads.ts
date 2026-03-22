import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as tauri from '@/tauriClient';
import type { Thread } from '@/types';

type UseThreadsReturn = {
  threads: Thread[];
  loadingThreads: boolean;
  error: string | null;
  fetchThreads: (projectId?: number | null) => Promise<void>;
  createThread: (title?: string | null, projectId?: number | null) => Promise<Thread | null>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  assignThreadToProject: (threadId: string, projectId: number | null) => Promise<void>;
};

export function useThreads(): UseThreadsReturn {
  const { t } = useTranslation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async (projectId?: number | null) => {
    setLoadingThreads(true);
    setError(null);
    try {
      const result = await tauri.listThreads(projectId) as Thread[];
      setThreads(result || []);
    } catch (err) {
      console.error(err);
      setError(t('chat:loadThreadsError'));
    } finally {
      setLoadingThreads(false);
    }
  }, [t]);

  const createThread = useCallback(async (title?: string | null, projectId?: number | null): Promise<Thread | null> => {
    setError(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticThread: Thread = {
      id: tempId,
      title: title || t('chat:newConversation'),
      project_id: projectId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let previousThreads: Thread[] = [];
    setThreads((prev) => {
      previousThreads = prev;
      return [optimisticThread, ...prev];
    });

    try {
      const created = await tauri.createThread({
        title: title || undefined,
        project_id: projectId || undefined,
      }) as Thread | null;

      if (created) {
        setThreads((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      } else {
        setThreads((prev) => prev.filter((t) => t.id !== tempId));
      }

      return created;
    } catch (err) {
      console.error(err);
      setThreads(previousThreads);
      setError(t('chat:createThreadError'));
      toast.error(t('chat:createThreadError'));
      return null;
    }
  }, [t]);

  const renameThread = useCallback(async (threadId: string, title: string) => {
    setError(null);

    let previousThreads: Thread[] = [];
    setThreads((prev) => {
      previousThreads = prev;
      return prev.map((t) => (t.id === threadId ? { ...t, title } : t));
    });

    try {
      await tauri.updateThread(threadId, { title });
    } catch (err) {
      console.error(err);
      setThreads(previousThreads);
      setError(t('chat:renameThreadError'));
      toast.error(t('chat:renameThreadError'));
    }
  }, [t]);

  const deleteThread = useCallback(async (threadId: string) => {
    setError(null);

    let previousThreads: Thread[] = [];
    setThreads((prev) => {
      previousThreads = prev;
      return prev.filter((t) => t.id !== threadId);
    });

    try {
      await tauri.deleteThread(threadId);
    } catch (err) {
      console.error(err);
      setThreads(previousThreads);
      setError(t('chat:deleteThreadError'));
      toast.error(t('chat:deleteThreadError'));
    }
  }, [t]);

  const assignThreadToProject = useCallback(async (threadId: string, projectId: number | null) => {
    setError(null);
    try {
      await tauri.updateThread(threadId, { project_id: projectId });
    } catch (err) {
      console.error(err);
      setError(t('chat:assignThreadError'));
    }
  }, [t]);

  return {
    threads,
    loadingThreads,
    error,
    fetchThreads,
    createThread,
    renameThread,
    deleteThread,
    assignThreadToProject,
  };
}
