import { useEffect, useState } from 'react';
import { useUser } from '../../UserContext';
import Aioption from '../../features/chat/AiOption';
import LogOut from '../../features/auth/Logout';
import chatGPT from '../../assets/chatGPT.mp4';
import apiClient from '../../apiClient';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

function Aside() {
  const profil = useAppStore((s) => s.profil);
  const setProfil = useAppStore((s) => s.setProfil);
  const selectedOption = useAppStore((s) => s.selectedOption);
  const setSelectedOption = useAppStore((s) => s.setSelectedOption);
  const projectMode = useAppStore((s) => s.projectMode);
  const setProjectMode = useAppStore((s) => s.setProjectMode);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId);
  const selectedThreadId = useAppStore((s) => s.selectedThreadId);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);

  const { userData } = useUser();
  const hasUserData = userData && userData.username;
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    instructions: '',
    context_data: '',
  });
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [confirmThreadDelete, setConfirmThreadDelete] = useState({
    open: false,
    threadId: null,
  });
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [showThreadManager, setShowThreadManager] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });
  const providerAvatar = selectedOption?.avatar || chatGPT;
  const activeProject = projects.find((project) => project.id === selectedProjectId);
  const visibleThreads = projectMode
    ? threads
    : threads.filter((thread) => thread.project_id === null || thread.project_id === undefined);

  useEffect(() => {
    const stored = localStorage.getItem('selected_provider');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.provider && parsed.model) {
        setSelectedOption(parsed);
      }
    } catch (err) {
      console.error(err);
    }
  }, [setSelectedOption]);

  useEffect(() => {
    if (!selectedOption) return;
    localStorage.setItem('selected_provider', JSON.stringify(selectedOption));
  }, [selectedOption]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures.
    }
  }, [isDark]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await apiClient.get('/api/projects');
      setProjects(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchThreads = async (projectId) => {
    setLoadingThreads(true);
    try {
      const url = projectId ? `/api/projects/${projectId}/threads` : '/api/threads';
      const response = await apiClient.get(url);
      setThreads(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    if (!userData) return;
    fetchProjects();
  }, [userData]);

  useEffect(() => {
    fetchThreads(projectMode ? selectedProjectId : null);
  }, [projectMode, selectedProjectId]);

  useEffect(() => {
    fetchThreads(projectMode ? selectedProjectId : null);
  }, [selectedThreadId, projectMode, selectedProjectId]);

  const handleSelectProject = (projectId) => {
    setProjectMode(true);
    setSelectedProjectId(projectId);
    setSelectedThreadId(null);
  };

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
      await fetchProjects();
      if (response.data?.id) {
        handleSelectProject(response.data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateThread = async () => {
    try {
      const targetProjectId = projectMode ? selectedProjectId : null;
      const url = targetProjectId ? `/api/projects/${targetProjectId}/threads` : '/api/threads';
      const response = await apiClient.post(url, {
        title: newThreadTitle || null,
      });
      setNewThreadTitle('');
      await fetchThreads(projectMode ? targetProjectId : null);
      if (response.data?.id) {
        setSelectedThreadId(response.data.id);
      }
    } catch (err) {
      console.error(err);
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
    try {
      await apiClient.patch(`/api/threads/${threadId}`, {
        title: editingThreadTitle,
      });
      handleCancelRenameThread();
      await fetchThreads(projectMode ? selectedProjectId : null);
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
      await fetchThreads(projectMode ? selectedProjectId : null);
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
      await fetchThreads(projectMode ? selectedProjectId : null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!projectMode) {
      setSelectedProjectId(null);
      setSelectedThreadId(null);
    }
    handleCancelRenameThread();
    setShowThreadManager(false);
  }, [projectMode, setSelectedProjectId, setSelectedThreadId]);

  const openPicker = () => {
    setShowProviderPicker(true);
    setShowProjectPanel(false);
  };

  const closePicker = () => {
    setTimeout(() => {
      setShowProviderPicker(false);
    }, 0);
  };

  if (showProviderPicker) {
    return (
      <aside className='flex h-screen w-80 shrink-0 flex-col border-r border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'>
        <div className='flex h-full flex-col'>
          <div className='border-b border-gray-200 px-4 py-4 dark:border-slate-800/70'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-[10px] uppercase tracking-[0.26em] text-gray-500 dark:text-slate-400'>
                  Fournisseur IA
                </p>
                <h2 className='mt-1 text-base font-semibold text-gray-900 dark:text-slate-100'>
                  Choisir le modèle
                </h2>
                <p className='mt-1 text-xs text-gray-500 dark:text-slate-400'>
                  Change rapidement selon ton besoin.
                </p>
              </div>
              <button
                type='button'
                onClick={closePicker}
                className='rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
              >
                Fermer
              </button>
            </div>
            <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-900'>
              <div className='flex items-center gap-2'>
                <video
                  src={providerAvatar}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className='h-8 w-8 rounded-md border border-gray-300 object-cover dark:border-slate-700'
                />
                <div className='min-w-0'>
                  <p className='truncate text-xs font-semibold text-gray-900 dark:text-slate-100'>
                    {selectedOption?.name || 'Aucun modèle sélectionné'}
                  </p>
                  <p className='truncate text-[11px] text-gray-500 dark:text-slate-400'>
                    {selectedOption?.provider || 'openai'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='flex-1 overflow-y-auto p-4'>
            <Aioption selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
          </div>

          <div className='border-t border-gray-200 px-4 py-4 dark:border-slate-800/70'>
            <LogOut setProfil={setProfil} profil={profil} />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className='flex h-screen w-80 shrink-0 flex-col border-r border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'>
      <div className='px-4 pt-4'>
        <div className='rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-900'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950'>
              <video
                src={providerAvatar}
                autoPlay
                muted
                loop
                playsInline
                className='h-8 w-8 rounded-md object-cover'
              />
            </div>
            <div className='min-w-0'>
              <p className='text-[10px] uppercase tracking-[0.26em] text-gray-500 dark:text-slate-400'>
                Bienvenue
              </p>
              <p className='truncate text-sm font-semibold text-gray-900 dark:text-white'>
                {hasUserData ? `Bonjour, ${userData.username}` : 'Chargement...'}
              </p>
              <p className='truncate text-[11px] text-gray-500 dark:text-slate-400'>
                {selectedOption?.name || 'Aucun modèle sélectionné'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='px-4 pt-3'>
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900'>
          <div className='flex rounded-md bg-white p-1 dark:bg-slate-950'>
            <button
              type='button'
              onClick={() => setProjectMode(true)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                projectMode
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Projet
            </button>
            <button
              type='button'
              onClick={() => setProjectMode(false)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                !projectMode
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Sans projet
            </button>
          </div>
        </div>
      </div>

      <div className='px-4 pt-3'>
        <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900'>
          <div>
            <p className='text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500'>
              Thème
            </p>
            <p className='text-sm font-semibold text-gray-900 dark:text-slate-100'>
              {isDark ? 'Sombre' : 'Clair'}
            </p>
          </div>
          <button
            type='button'
            onClick={() => setIsDark((current) => !current)}
            aria-pressed={isDark}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
              isDark
                ? 'border-teal-400/40 bg-teal-500/25'
                : 'border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950/90'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className='flex-1 min-h-0 px-4 pb-3 pt-3'>
        <div className='flex h-full min-h-0 flex-col gap-3'>
          {projectMode && (
            <div className='shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'>
              <div className='flex items-center justify-between'>
                <p className='text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500'>
                  Projet actif
                </p>
                <button
                  type='button'
                  onClick={() => setShowProjectPanel(true)}
                  className='rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
                >
                  Gérer
                </button>
              </div>
              <p className='mt-2 truncate text-sm font-semibold text-gray-900 dark:text-slate-100'>
                {activeProject?.name || 'Aucun projet sélectionné'}
              </p>
            </div>
          )}

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'>
            <div className='border-b border-gray-200 px-3 py-3 dark:border-slate-800'>
              <p className='text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-slate-500'>
                Conversations ({visibleThreads.length})
              </p>
              <div className='mt-2 flex items-center gap-2'>
                <button
                  type='button'
                  onClick={handleCreateThread}
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
                <p className='px-2 text-xs text-gray-500 dark:text-slate-500'>Chargement...</p>
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
        </div>
      </div>

      <div className='px-4 pb-3'>
        <button
          type='button'
          onClick={openPicker}
          className='flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
        >
          <span className='truncate'>{selectedOption?.name || 'Choisir le fournisseur IA'}</span>
          <span className='rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300'>
            Modifier
          </span>
        </button>
      </div>

      <div className='border-t border-gray-200 px-4 py-4 dark:border-slate-800/70'>
        <LogOut setProfil={setProfil} profil={profil} />
      </div>

      <div
        className={`absolute inset-0 z-40 flex h-full flex-col bg-white px-4 py-5 transition-transform duration-300 ease-out dark:bg-slate-950 ${
          showProjectPanel ? 'translate-x-0' : 'translate-x-full'
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
            onClick={() => setShowProjectPanel(false)}
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
                onClick={() => handleSelectProject(null)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                  selectedProjectId === null
                    ? 'bg-teal-500/20 text-teal-700 dark:text-teal-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                Tous les projets
              </button>
              {loadingProjects ? (
                <p className='text-xs text-gray-500 dark:text-slate-500'>Chargement...</p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type='button'
                    onClick={() => handleSelectProject(project.id)}
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
                onClick={handleCreateThread}
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
                <p className='text-xs text-gray-500 dark:text-slate-500'>Chargement...</p>
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
    </aside>
  );
}

export default Aside;
