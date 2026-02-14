import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import apiClient from '@/apiClient';
import ProjectListSkeleton from '@/components/ui/ProjectListSkeleton';
import ThreadListSkeleton from '@/components/ui/ThreadListSkeleton';

interface ProjectFormPanelProps {
  show: boolean;
  onClose: () => void;
  projects: any[];
  loadingProjects: boolean;
  threads: any[];
  loadingThreads: boolean;
  newThreadTitle: string;
  setNewThreadTitle: (v: string) => void;
  onCreateThread: () => void;
  onSelectProject: (projectId: number | null) => void;
  onRefreshProjects: () => void;
  setConfirmThreadDelete: (v: { open: boolean; threadId: any }) => void;
}

function ProjectFormPanel({
  show,
  onClose,
  projects,
  loadingProjects,
  threads,
  loadingThreads,
  newThreadTitle,
  setNewThreadTitle,
  onCreateThread,
  onSelectProject,
  onRefreshProjects,
  setConfirmThreadDelete,
}: ProjectFormPanelProps) {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectedThreadId = useAppStore((s) => s.selectedThreadId);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    instructions: '',
    context_data: '',
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      const response = await apiClient.post('/api/projects', {
        name: newProject.name,
        instructions: newProject.instructions,
        context_data: newProject.context_data,
      });
      setNewProject({ name: '', instructions: '', context_data: '' });
      setShowNewProject(false);
      await onRefreshProjects();
      if (response.data?.id) {
        onSelectProject(response.data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex h-full flex-col bg-white px-4 py-5 transition-transform duration-300 ease-out dark:bg-slate-950 ${
        show ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
    >
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400'>
            Projets
          </p>
          <h3 className='text-base font-semibold text-gray-900 dark:text-slate-100'>
            Gestion des projets
          </h3>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
        >
          Fermer
        </button>
      </div>

      <div className='mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-24 pr-1'>
        <Link
          to='/projects'
          className='flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition hover:border-gray-300 hover:text-gray-900 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white'
        >
          <span className='text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400'>
            Vue projets
          </span>
          <span className='text-xs font-semibold text-teal-600 dark:text-teal-300'>Ouvrir</span>
        </Link>
        <div className='rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200'>
          <div className='flex items-center justify-between'>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500'>
              Projets
            </p>
            <button
              type='button'
              onClick={() => setShowNewProject((prev) => !prev)}
              className='rounded-full border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
            >
              Nouveau
            </button>
          </div>

          {showNewProject && (
            <div className='mt-3 space-y-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700/70 dark:bg-slate-950/70'>
              <input
                type='text'
                value={newProject.name}
                onChange={(event) =>
                  setNewProject((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder='Nom du projet'
                className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100'
              />
              <textarea
                value={newProject.instructions}
                onChange={(event) =>
                  setNewProject((prev) => ({
                    ...prev,
                    instructions: event.target.value,
                  }))
                }
                placeholder='Instructions (optionnel)'
                rows={2}
                className='w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100'
              />
              <textarea
                value={newProject.context_data}
                onChange={(event) =>
                  setNewProject((prev) => ({
                    ...prev,
                    context_data: event.target.value,
                  }))
                }
                placeholder='Données de contexte (optionnel)'
                rows={2}
                className='w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100'
              />
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={handleCreateProject}
                  className='flex-1 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600'
                >
                  Créer
                </button>
                <button
                  type='button'
                  onClick={() => setShowNewProject(false)}
                  className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500'
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className='mt-3 space-y-2'>
            <button
              type='button'
              onClick={() => onSelectProject(null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                selectedProjectId === null
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
              }`}
            >
              Tous les projets
            </button>
            {loadingProjects ? (
              <ProjectListSkeleton />
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type='button'
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                    selectedProjectId === project.id
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {project.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className='rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200'>
          <div className='flex items-center justify-between'>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500'>
              Conversations
            </p>
            <button
              type='button'
              onClick={onCreateThread}
              className='rounded-full border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
            >
              Nouveau
            </button>
          </div>
          <input
            type='text'
            value={newThreadTitle}
            onChange={(event) => setNewThreadTitle(event.target.value)}
            placeholder='Titre de conversation (optionnel)'
            className='mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100'
          />
          <div className='mt-3 space-y-2'>
            {loadingThreads ? (
              <ThreadListSkeleton />
            ) : threads.length === 0 ? (
              <p className='text-xs text-gray-500 dark:text-slate-500'>
                Aucune conversation pour le moment
              </p>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                    selectedThreadId === thread.id
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedThreadId(thread.id)}
                    className='flex-1 text-left'
                  >
                    {thread.title || 'Conversation sans titre'}
                  </button>
                  <button
                    type='button'
                    onClick={() =>
                      setConfirmThreadDelete({
                        open: true,
                        threadId: thread.id,
                      })
                    }
                    className='ml-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400 hover:text-red-300'
                  >
                    Supprimer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectFormPanel;
