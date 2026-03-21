import { useCallback, useState } from 'react';
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
      setError('Erreur lors du chargement des conversations.');
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const createThread = useCallback(async (title?: string | null, projectId?: number | null): Promise<Thread | null> => {
    setError(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticThread: Thread = {
      id: tempId,
      title: title || 'Nouvelle conversation',
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
      setError('Erreur lors de la création de la conversation.');
      toast.error('Erreur lors de la création de la conversation');
      return null;
    }
  }, []);

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
      setError('Erreur lors du renommage de la conversation.');
      toast.error('Erreur lors du renommage de la conversation');
    }
  }, []);

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
      setError('Erreur lors de la suppression de la conversation.');
      toast.error('Erreur lors de la suppression de la conversation');
    }
  }, []);

  const assignThreadToProject = useCallback(async (threadId: string, projectId: number | null) => {
    setError(null);
    try {
      await tauri.updateThread(threadId, { project_id: projectId });
    } catch (err) {
      console.error(err);
      setError('Erreur lors de l\'assignation de la conversation au projet.');
    }
  }, []);

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
