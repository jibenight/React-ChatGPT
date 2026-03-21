import React, { useEffect, useState } from 'react';
import * as tauri from '@/tauriClient';
import { Link } from 'react-router-dom';
import ProjectListSkeleton from '@/components/ui/ProjectListSkeleton';
import ThreadListSkeleton from '@/components/ui/ThreadListSkeleton';

function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [confirmThreadDelete, setConfirmThreadDelete] = useState({
    open: false,
    threadId: null,
  });
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    instructions: '',
    context_data: '',
  });
  const [editProject, setEditProject] = useState({
    name: '',
    description: '',
    instructions: '',
    context_data: '',
  });
  type Status = { type: 'success' | 'error'; text: string } | null;
  const [status, setStatus] = useState<Status>(null);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await tauri.listProjects() as any[];
      setProjects(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setEditProject({
      name: selectedProject.name || '',
      description: selectedProject.description || '',
      instructions: selectedProject.instructions || '',
      context_data: selectedProject.context_data || '',
    });
  }, [selectedProject]);

  const loadThreads = async (projectId) => {
    if (!projectId) return;
    setLoadingThreads(true);
    try {
      const data = await tauri.listThreads(projectId) as any[];
      setThreads(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      setThreads([]);
      setEditingThreadId(null);
      setEditingThreadTitle('');
      return;
    }
    loadThreads(selectedProject.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const handleCreate = async () => {
    if (!newProject.name.trim()) return;
    try {
      const created = await tauri.createProject(newProject) as any;
      setNewProject({
        name: '',
        description: '',
        instructions: '',
        context_data: '',
      });
      setStatus({ type: 'success', text: 'Projet créé.' });
      await loadProjects();
      if (created?.id) {
        setSelectedProject(created);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de créer le projet.' });
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject) return;
    try {
      await tauri.updateProject(selectedProject.id, editProject);
      setStatus({ type: 'success', text: 'Projet mis à jour.' });
      await loadProjects();
      const refreshed = projects.find(item => item.id === selectedProject.id);
      if (refreshed) {
        setSelectedProject(refreshed);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de mettre à jour le projet.' });
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await tauri.deleteProject(selectedProject.id);
      setSelectedProject(null);
      setStatus({ type: 'success', text: 'Projet supprimé.' });
      await loadProjects();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de supprimer le projet.' });
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!selectedProject) return;
    try {
      await tauri.deleteThread(threadId);
      await loadThreads(selectedProject.id);
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        text: 'Impossible de supprimer la conversation.',
      });
    }
  };

  const handleStartRenameThread = (thread) => {
    setEditingThreadId(thread.id);
    setEditingThreadTitle(thread.title || '');
  };

  const handleCancelRenameThread = () => {
    setEditingThreadId(null);
    setEditingThreadTitle('');
  };

  const handleRenameThread = async (threadId) => {
    if (!selectedProject) return;
    try {
      await tauri.updateThread(threadId, { title: editingThreadTitle });
      setStatus({ type: 'success', text: 'Conversation renommée.' });
      handleCancelRenameThread();
      await loadThreads(selectedProject.id);
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        text: 'Impossible de renommer la conversation.',
      });
    }
  };

  return (
    <div className='relative h-screen flex-1 overflow-y-auto overflow-x-hidden bg-linear-to-br from-gray-50 via-white to-gray-100 text-gray-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-foreground'>
      <div className='mx-auto max-w-6xl px-4 py-10'>
        <div className='mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground'>
              Projets
            </p>
            <h1 className='text-3xl font-semibold text-gray-900 dark:text-foreground'>
              Espace projets
            </h1>
            <p className='text-sm text-gray-500 dark:text-muted-foreground'>
              Gérer les instructions et le contexte de chaque projet.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              to='/chat'
              className='inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
            >
              <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M18 6 6 18' />
                <path d='m6 6 12 12' />
              </svg>
              Fermer
            </Link>
          </div>
        </div>

        {status && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
            }`}
          >
            {status.text}
          </div>
        )}

        <div className='grid gap-6 lg:grid-cols-[1.1fr_1.4fr]'>
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              Créer un projet
              </h2>
            </div>
            <div className='mt-4 grid gap-4'>
              <input
                type='text'
                value={newProject.name}
                onChange={event =>
                  setNewProject(prev => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder='Nom du projet'
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
              />
              <input
                type='text'
                value={newProject.description}
                onChange={event =>
                  setNewProject(prev => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder='Description courte (optionnel)'
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
              />
              <textarea
                rows={4}
                value={newProject.instructions}
                onChange={event =>
                  setNewProject(prev => ({
                    ...prev,
                    instructions: event.target.value,
                  }))
                }
                placeholder="Instructions pour l'IA (optionnel)"
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
              />
              <textarea
                rows={4}
                value={newProject.context_data}
                onChange={event =>
                  setNewProject(prev => ({
                    ...prev,
                    context_data: event.target.value,
                  }))
                }
                placeholder='Données de contexte (optionnel)'
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
              />
              <button
                type='button'
                onClick={handleCreate}
                className='inline-flex items-center justify-center rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600'
              >
                Créer le projet
              </button>
            </div>
          </section>

          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
                Vos projets
              </h2>
            </div>
            <div className='mt-4 grid gap-3'>
              {loadingProjects ? (
                <ProjectListSkeleton />
              ) : projects.length === 0 ? (
                <p className='text-sm text-gray-500 dark:text-muted-foreground'>
                  Aucun projet pour le moment.
                </p>
              ) : null}
              {!loadingProjects && projects.map(project => (
                <div
                  key={project.id}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedProject?.id === project.id
                        ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-teal-200 hover:bg-teal-50 dark:border-border dark:bg-card/60 dark:text-foreground dark:hover:border-teal-500/40 dark:hover:bg-teal-500/10'
                    }`}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedProject(project)}
                    className='w-full text-left'
                  >
                    <p className='font-semibold'>{project.name}</p>
                    <p className='text-xs text-gray-500 dark:text-muted-foreground'>
                      {project.description || 'Aucune description'}
                    </p>
                  </button>
                  <Link
                    to={`/chat?projectId=${project.id}`}
                    className='mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200'
                  >
                    Ouvrir dans le chat
                  </Link>
                </div>
              ))}
            </div>
            {selectedProject && (
              <div className='mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-foreground'>
                  Modifier le projet
                </h3>
                <Link
                  to={`/chat?projectId=${selectedProject.id}`}
                  className='mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200'
                >
                  Ouvrir le projet dans le chat
                </Link>
                <div className='mt-3 grid gap-3'>
                  <input
                    type='text'
                    value={editProject.name}
                    onChange={event =>
                      setEditProject(prev => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                  />
                  <input
                    type='text'
                    value={editProject.description}
                    onChange={event =>
                      setEditProject(prev => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                  />
                  <textarea
                    rows={4}
                    value={editProject.instructions}
                    onChange={event =>
                      setEditProject(prev => ({
                        ...prev,
                        instructions: event.target.value,
                      }))
                    }
                    className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                  />
                  <textarea
                    rows={4}
                    value={editProject.context_data}
                    onChange={event =>
                      setEditProject(prev => ({
                        ...prev,
                        context_data: event.target.value,
                      }))
                    }
                    className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                  />
                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={handleUpdate}
                      className='rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600'
                    >
                      Enregistrer
                    </button>
                    <button
                      type='button'
                      onClick={() => setConfirmProjectDelete(true)}
                      className='rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                    >
                      Supprimer le projet
                    </button>
                  </div>
                </div>

                {/* ── Section Conversations ───────────────────────────── */}
                <div className='mt-6 border-t border-gray-200 pt-4 dark:border-border'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-sm font-semibold text-gray-700 dark:text-foreground'>
                      Conversations
                    </h4>
                  </div>
                  <div className='mt-3 space-y-2'>
                    {loadingThreads ? (
                      <ThreadListSkeleton />
                    ) : threads.length === 0 ? (
                      <p className='text-xs text-gray-500 dark:text-muted-foreground'>
                        Aucune conversation pour ce projet.
                      </p>
                    ) : (
                      threads.map(thread => {
                        const isEditing = editingThreadId === thread.id;
                        return (
                          <div
                            key={thread.id}
                            className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-border dark:bg-card'
                          >
                            {isEditing ? (
                              <input
                                type='text'
                                value={editingThreadTitle}
                                onChange={event =>
                                  setEditingThreadTitle(event.target.value)
                                }
                                placeholder='Titre de conversation'
                                className='mr-3 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                              />
                            ) : (
                              <span className='font-semibold text-gray-700 dark:text-foreground'>
                                {thread.title || 'Conversation sans titre'}
                              </span>
                            )}
                            <div className='flex items-center gap-2'>
                              {isEditing ? (
                                <>
                                  <button
                                    type='button'
                                    onClick={() => handleRenameThread(thread.id)}
                                    className='text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200'
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    type='button'
                                    onClick={handleCancelRenameThread}
                                    className='text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground'
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Link
                                    to={`/chat?projectId=${selectedProject.id}&threadId=${thread.id}`}
                                    className='text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200'
                                  >
                                    Ouvrir
                                  </Link>
                                  <button
                                    type='button'
                                    onClick={() => handleStartRenameThread(thread)}
                                    className='text-xs font-semibold text-gray-600 hover:text-gray-800 dark:text-muted-foreground dark:hover:text-foreground'
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
                                    className='text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200'
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        <div className='mt-10 flex justify-center'>
        </div>
      </div>

      {/* ── Modal: confirm thread delete ──────────────────────────────── */}
      {confirmThreadDelete.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none'>
            <h4 className='text-base font-semibold text-gray-900 dark:text-foreground'>
              Supprimer la conversation
            </h4>
            <p className='mt-2 text-sm text-gray-600 dark:text-muted-foreground'>
              Cette action est irréversible.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted'
                onClick={() =>
                  setConfirmThreadDelete({ open: false, threadId: null })
                }
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

      {/* ── Modal: confirm project delete ─────────────────────────────── */}
      {confirmProjectDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none'>
            <h4 className='text-base font-semibold text-gray-900 dark:text-foreground'>
              Supprimer le projet
            </h4>
            <p className='mt-2 text-sm text-gray-600 dark:text-muted-foreground'>
              Ce projet sera supprimé et ses conversations détachées. Action
              irréversible.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted'
                onClick={() => setConfirmProjectDelete(false)}
              >
                Annuler
              </button>
              <button
                type='button'
                className='rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700'
                onClick={() => {
                  setConfirmProjectDelete(false);
                  handleDelete();
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Projects;
