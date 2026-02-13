import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import apiClient from '@/apiClient';
import ThreadListSkeleton from '@/components/ui/ThreadListSkeleton';

interface SidebarThreadListProps {
  threads: any[];
  projects: any[];
  loadingThreads: boolean;
  newThreadTitle: string;
  setNewThreadTitle: (v: string) => void;
  onCreateThread: () => void;
  onRefreshThreads: () => void;
  confirmThreadDelete: { open: boolean; threadId: any };
  setConfirmThreadDelete: (v: { open: boolean; threadId: any }) => void;
}

function SidebarThreadList({
  threads,
  projects,
  loadingThreads,
  newThreadTitle,
  setNewThreadTitle,
  onCreateThread,
  onRefreshThreads,
  confirmThreadDelete,
  setConfirmThreadDelete,
}: SidebarThreadListProps) {
  const projectMode = useAppStore((s) => s.projectMode);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectedThreadId = useAppStore((s) => s.selectedThreadId);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);

  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [showThreadManager, setShowThreadManager] = useState(false);

  const visibleThreads = projectMode
    ? threads
    : threads.filter((thread) => thread.project_id === null || thread.project_id === undefined);

  const handleStartRenameThread = (thread) => {
    setEditingThreadId(thread.id);
    setEditingThreadTitle(thread.title || '');
  };

  const handleCancelRenameThread = () => {
    setEditingThreadId(null);
    setEditingThreadTitle('');
  };

  const handleRenameThread = async (threadId) => {
    try {
      await apiClient.patch(`/api/threads/${threadId}`, {
        title: editingThreadTitle,
      });
      handleCancelRenameThread();
      onRefreshThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignThread = async (threadId, projectId) => {
    try {
      await apiClient.patch(`/api/threads/${threadId}`, {
        projectId,
      });
      if (projectMode && projectId !== selectedProjectId) {
        setSelectedThreadId(null);
      }
      onRefreshThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteThread = async (threadId) => {
    try {
      await apiClient.delete(`/api/threads/${threadId}`);
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
      onRefreshThreads();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'>
        <div className='border-b border-gray-200 px-3 py-3 dark:border-slate-800'>
          <p className='text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-slate-500'>
            Conversations ({visibleThreads.length})
          </p>
          <div className='mt-2 flex items-center gap-2'>
            <button
              type='button'
              onClick={onCreateThread}
              className='rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
            >
              Nouveau
            </button>
            {visibleThreads.length > 0 && (
              <button
                type='button'
                onClick={() => {
                  setShowThreadManager((prev) => !prev);
                  handleCancelRenameThread();
                }}
                className='rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
              >
                {showThreadManager ? 'Fermer' : 'Gérer'}
              </button>
            )}
          </div>
          <input
            type='text'
            value={newThreadTitle}
            onChange={(event) => setNewThreadTitle(event.target.value)}
            placeholder='Titre de conversation (optionnel)'
            className='mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
          />
        </div>

        <div className='mt-0 flex-1 min-h-0 space-y-2 overflow-y-auto px-2 py-2'>
          {loadingThreads ? (
            <ThreadListSkeleton />
          ) : visibleThreads.length === 0 ? (
            <p className='px-2 text-xs text-gray-500 dark:text-slate-500'>
              Aucune conversation pour le moment
            </p>
          ) : showThreadManager ? (
            visibleThreads.map((thread) => {
              const isEditing = editingThreadId === thread.id;
              return (
                <div
                  key={thread.id}
                  className={`rounded-lg border px-3 py-3 text-xs transition ${
                    selectedThreadId === thread.id
                      ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-100'
                      : 'border-gray-200 bg-white text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  }`}
                >
                  <div className='text-xs font-semibold text-gray-900 dark:text-slate-100'>
                    {isEditing ? (
                      <input
                        type='text'
                        value={editingThreadTitle}
                        onChange={(event) => setEditingThreadTitle(event.target.value)}
                        placeholder='Titre de conversation'
                        className='w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
                      />
                    ) : (
                      <span className='line-clamp-2'>
                        {thread.title || 'Conversation sans titre'}
                      </span>
                    )}
                  </div>
                  <div className='mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em]'>
                    {isEditing ? (
                      <>
                        <button
                          type='button'
                          onClick={() => handleRenameThread(thread.id)}
                          className='text-teal-600 transition hover:text-teal-700 dark:text-teal-200 dark:hover:text-teal-100'
                        >
                          Enregistrer
                        </button>
                        <button
                          type='button'
                          onClick={handleCancelRenameThread}
                          className='text-gray-500 transition hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          onClick={() => setSelectedThreadId(thread.id)}
                          className='text-teal-600 transition hover:text-teal-700 dark:text-teal-200 dark:hover:text-teal-100'
                        >
                          Ouvrir
                        </button>
                        <button
                          type='button'
                          onClick={() => handleStartRenameThread(thread)}
                          className='text-gray-500 transition hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                        >
                          Renommer
                        </button>
                        <button
                          type='button'
                          onClick={() =>
                            setConfirmThreadDelete({
                              open: true,
                              threadId: thread.id,
                            })
                          }
                          className='text-red-400 transition hover:text-red-300'
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                  <div className='mt-2'>
                    <select
                      value={thread.project_id ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        const parsed = value === '' ? null : Number(value);
                        handleAssignThread(thread.id, Number.isNaN(parsed) ? null : parsed);
                      }}
                      className='w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                    >
                      <option value=''>Sans projet</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          ) : (
            visibleThreads.map((thread) => (
              <button
                key={thread.id}
                type='button'
                onClick={() => setSelectedThreadId(thread.id)}
                className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-semibold transition ${
                  selectedThreadId === thread.id
                    ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-100'
                    : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-white dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-950'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    selectedThreadId === thread.id ? 'bg-teal-300' : 'bg-slate-600'
                  }`}
                />
                <span className='truncate'>{thread.title || 'Conversation sans titre'}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {confirmThreadDelete.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 dark:shadow-none'>
            <h4 className='text-base font-semibold text-gray-900 dark:text-slate-100'>
              Supprimer la conversation
            </h4>
            <p className='mt-2 text-sm text-gray-600 dark:text-slate-300'>
              Cette action est irréversible.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                onClick={() => setConfirmThreadDelete({ open: false, threadId: null })}
              >
                Annuler
              </button>
              <button
                type='button'
                className='rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700'
                onClick={() => {
                  const target = confirmThreadDelete.threadId;
                  setConfirmThreadDelete({ open: false, threadId: null });
                  if (target) {
                    handleDeleteThread(target);
                  }
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SidebarThreadList;
