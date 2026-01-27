import { useEffect, useState } from 'react';
import { useUser } from '../../UserContext';
import Aioption from '../../features/chat/AiOption';
import LogOut from '../../features/auth/Logout';
import chatGPT from '../../assets/chatGPT.mp4';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';
import { Link } from 'react-router-dom';

function Aside({
  setProfil,
  profil,
  selectedOption,
  setSelectedOption,
  projectMode,
  setProjectMode,
  selectedProjectId,
  setSelectedProjectId,
  selectedThreadId,
  setSelectedThreadId,
}) {
  const { userData } = useUser();
  const hasUserData = userData && userData.username;
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [projects, setProjects] = useState([]);
  const [threads, setThreads] = useState([]);
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
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [showThreadManager, setShowThreadManager] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });
  const providerAvatar = selectedOption?.avatar || chatGPT;
  const activeProject = projects.find(
    project => project.id === selectedProjectId,
  );
  const visibleThreads = projectMode
    ? threads
    : threads.filter(
        thread => thread.project_id === null || thread.project_id === undefined,
      );

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
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingProjects(true);
    try {
      const response = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchThreads = async projectId => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingThreads(true);
    try {
      const url = projectId
        ? `${API_BASE}/api/projects/${projectId}/threads`
        : `${API_BASE}/api/threads`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const handleSelectProject = projectId => {
    setProjectMode(true);
    setSelectedProjectId(projectId);
    setSelectedThreadId(null);
  };

  const handleCreateProject = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!newProject.name.trim()) return;
    try {
      const response = await axios.post(
        `${API_BASE}/api/projects`,
        {
          name: newProject.name,
          instructions: newProject.instructions,
          context_data: newProject.context_data,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const targetProjectId = projectMode ? selectedProjectId : null;
      const url = targetProjectId
        ? `${API_BASE}/api/projects/${targetProjectId}/threads`
        : `${API_BASE}/api/threads`;
      const response = await axios.post(
        url,
        { title: newThreadTitle || null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNewThreadTitle('');
      await fetchThreads(projectMode ? targetProjectId : null);
      if (response.data?.id) {
        setSelectedThreadId(response.data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartRenameThread = thread => {
    setEditingThreadId(thread.id);
    setEditingThreadTitle(thread.title || '');
  };

  const handleCancelRenameThread = () => {
    setEditingThreadId(null);
    setEditingThreadTitle('');
  };

  const handleRenameThread = async threadId => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await axios.patch(
        `${API_BASE}/api/threads/${threadId}`,
        { title: editingThreadTitle },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      handleCancelRenameThread();
      await fetchThreads(projectMode ? selectedProjectId : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignThread = async (threadId, projectId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await axios.patch(
        `${API_BASE}/api/threads/${threadId}`,
        { projectId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (projectMode && projectId !== selectedProjectId) {
        setSelectedThreadId(null);
      }
      await fetchThreads(projectMode ? selectedProjectId : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteThread = async threadId => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/api/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      <aside className='bg-gray-800 w-80 h-screen flex flex-col shrink-0'>
        <div className='flex items-center justify-between px-4 py-4 border-b border-gray-700'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400'>
              Fournisseurs
            </p>
            <h2 className='text-base font-semibold text-gray-100'>
              Choisir un modèle
            </h2>
          </div>
          <button
            type='button'
            onClick={closePicker}
            className='rounded-full border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-200 hover:border-gray-500 hover:text-white'
          >
            Fermer
          </button>
        </div>
        <div className='flex-1 overflow-y-auto p-4'>
          <Aioption
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
          />
        </div>
        <div className='border-t border-gray-700 px-4 py-4'>
          <LogOut setProfil={setProfil} profil={profil} />
        </div>
      </aside>
    );
  }

  return (
    <aside className='relative bg-gray-800 w-80 h-screen flex flex-col shrink-0 overflow-hidden'>
      <div className='px-4 pt-2'>
        <div className='flex items-center gap-3 rounded-2xl border border-gray-700/60 bg-gray-900/40 p-3'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gray-700'>
            <video
              src={providerAvatar}
              autoPlay
              muted
              loop
              playsInline
              className='h-10 w-10 rounded-full'
            />
          </div>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400'>
              Bienvenue
            </p>
            <p className='text-sm font-semibold text-gray-100'>
              {hasUserData ? `Bonjour, ${userData.username}` : 'Chargement...'}
            </p>
          </div>
        </div>
      </div>

      <div className='px-4 pt-2'>
        <div className='rounded-2xl border border-gray-700/60 bg-gray-900/40 p-3'>
          {/* <p className='pb-2 text-[10px] uppercase tracking-[0.2em] text-gray-500'>
            Mode
          </p> */}
          <div className='flex rounded-full bg-gray-900/70 p-1'>
            <button
              type='button'
              onClick={() => setProjectMode(true)}
              className={`flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                projectMode
                  ? 'bg-teal-500/20 text-teal-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Projet
            </button>
            <button
              type='button'
              onClick={() => setProjectMode(false)}
              className={`flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                !projectMode
                  ? 'bg-teal-500/20 text-teal-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sans projet
            </button>
          </div>
        </div>
      </div>

      <div className='px-4 pt-2'>
        <div className='flex items-center justify-between rounded-2xl border border-gray-700/60 bg-gray-900/40 p-3'>
          <div>
            <p className='text-[10px] uppercase tracking-[0.2em] text-gray-500'>
              Thème
            </p>
            <p className='text-sm font-semibold text-gray-100'>
              {isDark ? 'Sombre' : 'Clair'}
            </p>
          </div>
          <button
            type='button'
            onClick={() => setIsDark(current => !current)}
            aria-pressed={isDark}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
              isDark
                ? 'border-teal-400/40 bg-teal-500/25'
                : 'border-gray-700 bg-gray-800/80'
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

      <div className='flex-1 min-h-0 px-4 pt-2'>
        <div className='flex h-full min-h-0 flex-col gap-2'>
          {projectMode && (
            <div className='flex  shrink-0 flex-col justify-between rounded-2xl border border-gray-700/60 bg-gray-900/40 p-3 text-sm text-gray-200'>
              <div className='flex items-center justify-between'>
                <p className='text-xs uppercase tracking-[0.2em] text-gray-500'>
                  Projet actif
                </p>
                <button
                  type='button'
                  onClick={() => setShowProjectPanel(true)}
                  className='rounded-full border border-gray-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-200 hover:border-gray-500 hover:text-white'
                >
                  Gérer
                </button>
              </div>
              <p className='mt-2 text-sm font-semibold text-gray-100'>
                {activeProject?.name || 'Aucun'}
              </p>
            </div>
          )}

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-900/40 p-3 text-sm text-gray-200'>
            <div className='space-y-2'>
              <p className='text-xs uppercase tracking-[0.2em] text-gray-500'>
                Conversations
              </p>
            </div>
            <div className='mt-2 flex items-center gap-2'>
              <button
                type='button'
                onClick={handleCreateThread}
                className='rounded-full border border-gray-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-200 hover:border-gray-500 hover:text-white'
              >
                Nouveau
              </button>
              {visibleThreads.length > 0 && (
                <button
                  type='button'
                  onClick={() => {
                    setShowThreadManager(prev => !prev);
                    handleCancelRenameThread();
                  }}
                  className='rounded-full border border-gray-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-200 hover:border-gray-500 hover:text-white'
                >
                  {showThreadManager ? 'Fermer' : 'Gérer'}
                </button>
              )}
            </div>
            <input
              type='text'
              value={newThreadTitle}
              onChange={event => setNewThreadTitle(event.target.value)}
              placeholder='Titre de conversation (optionnel)'
              className='mt-2 w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-100 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
            />
            <div className='mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1'>
              {loadingThreads ? (
                <p className='text-xs text-gray-500'>Chargement...</p>
              ) : visibleThreads.length === 0 ? (
                <p className='text-xs text-gray-500'>
                  Aucune conversation pour le moment
                </p>
              ) : showThreadManager ? (
                visibleThreads.map(thread => {
                  const isEditing = editingThreadId === thread.id;
                  return (
                    <div
                      key={thread.id}
                      className={`rounded-lg border px-3 py-2 text-xs transition ${
                        selectedThreadId === thread.id
                          ? 'border-teal-500/40 bg-teal-500/10 text-teal-100'
                          : 'border-gray-700/60 bg-gray-900/40 text-gray-300'
                      }`}
                    >
                      <div className='text-xs font-semibold text-gray-100'>
                        {isEditing ? (
                          <input
                            type='text'
                            value={editingThreadTitle}
                            onChange={event =>
                              setEditingThreadTitle(event.target.value)
                            }
                            placeholder='Titre de conversation'
                            className='w-full rounded-lg border border-gray-700 bg-gray-900/70 px-2 py-1 text-xs text-gray-100 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
                          />
                        ) : (
                          <span>
                            {thread.title || 'Conversation sans titre'}
                          </span>
                        )}
                      </div>
                      <div className='mt-2 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em]'>
                        {isEditing ? (
                          <>
                            <button
                              type='button'
                              onClick={() => handleRenameThread(thread.id)}
                              className='text-teal-200 hover:text-teal-100'
                            >
                              Enregistrer
                            </button>
                            <button
                              type='button'
                              onClick={handleCancelRenameThread}
                              className='text-gray-400 hover:text-gray-200'
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type='button'
                              onClick={() => setSelectedThreadId(thread.id)}
                              className='text-teal-200 hover:text-teal-100'
                            >
                              Ouvrir
                            </button>
                            <button
                              type='button'
                              onClick={() => handleStartRenameThread(thread)}
                              className='text-gray-400 hover:text-gray-200'
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
                              className='text-red-400 hover:text-red-300'
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                      <div className='mt-2'>
                        <select
                          value={thread.project_id ?? ''}
                          onChange={event => {
                            const value = event.target.value;
                            const parsed = value === '' ? null : Number(value);
                            handleAssignThread(
                              thread.id,
                              Number.isNaN(parsed) ? null : parsed,
                            );
                          }}
                          className='w-full rounded-lg border border-gray-700 bg-gray-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-200 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
                        >
                          <option value=''>Sans projet</option>
                          {projects.map(project => (
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
                visibleThreads.map(thread => (
                  <button
                    key={thread.id}
                    type='button'
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                      selectedThreadId === thread.id
                        ? 'bg-teal-500/20 text-teal-100'
                        : 'text-gray-300 hover:bg-gray-700/40'
                    }`}
                  >
                    {thread.title || 'Conversation sans titre'}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='px-4 py-2'>
        <button
          type='button'
          onClick={openPicker}
          className='flex w-full items-center justify-between rounded-2xl border border-teal-500/40 bg-teal-500/10 px-4 py-3 text-left text-sm font-semibold text-teal-100 shadow-sm transition hover:border-teal-400 hover:bg-teal-500/20'
        >
          <span>Choisir le fournisseur IA</span>
          <span className='rounded-full bg-teal-500 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white'>
            Modifier
          </span>
        </button>
      </div>

      <div className='border-t border-gray-700 px-4 py-4'>
        <LogOut setProfil={setProfil} profil={profil} />
      </div>

      <div
        className={`absolute inset-0 z-40 flex h-full flex-col bg-gray-900/95 px-4 py-5 transition-transform duration-300 ease-out ${
          showProjectPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400'>
              Projets
            </p>
            <h3 className='text-base font-semibold text-gray-100'>
              Gestion des projets
            </h3>
          </div>
          <button
            type='button'
            onClick={() => setShowProjectPanel(false)}
            className='rounded-full border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-200 hover:border-gray-500 hover:text-white'
          >
            Fermer
          </button>
        </div>

        <div className='mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-24 pr-1'>
          <Link
            to='/projects'
            className='flex items-center justify-between rounded-2xl border border-gray-700/60 bg-gray-900/60 px-4 py-3 text-sm text-gray-200 transition hover:border-gray-600 hover:text-white'
          >
            <span className='text-xs uppercase tracking-[0.2em] text-gray-400'>
              Vue projets
            </span>
            <span className='text-xs font-semibold text-teal-300'>Ouvrir</span>
          </Link>
          <div className='rounded-2xl border border-gray-700/60 bg-gray-900/60 p-4 text-sm text-gray-200'>
            <div className='flex items-center justify-between'>
              <p className='text-xs uppercase tracking-[0.2em] text-gray-500'>
                Projets
              </p>
              <button
                type='button'
                onClick={() => setShowNewProject(prev => !prev)}
                className='rounded-full border border-gray-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-200 hover:border-gray-500 hover:text-white'
              >
                Nouveau
              </button>
            </div>

            {showNewProject && (
              <div className='mt-3 space-y-2 rounded-xl border border-gray-700/60 bg-gray-900/70 p-3'>
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
                  className='w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-100 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
                />
                <textarea
                  value={newProject.instructions}
                  onChange={event =>
                    setNewProject(prev => ({
                      ...prev,
                      instructions: event.target.value,
                    }))
                  }
                  placeholder='Instructions (optionnel)'
                  rows={2}
                  className='w-full resize-none rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-100 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
                />
                <textarea
                  value={newProject.context_data}
                  onChange={event =>
                    setNewProject(prev => ({
                      ...prev,
                      context_data: event.target.value,
                    }))
                  }
                  placeholder='Données de contexte (optionnel)'
                  rows={2}
                  className='w-full resize-none rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-100 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
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
                    className='flex-1 rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-gray-500'
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
                    ? 'bg-teal-500/20 text-teal-100'
                    : 'text-gray-300 hover:bg-gray-700/40'
                }`}
              >
                Tous les projets
              </button>
              {loadingProjects ? (
                <p className='text-xs text-gray-500'>Chargement...</p>
              ) : (
                projects.map(project => (
                  <button
                    key={project.id}
                    type='button'
                    onClick={() => handleSelectProject(project.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                      selectedProjectId === project.id
                        ? 'bg-teal-500/20 text-teal-100'
                        : 'text-gray-300 hover:bg-gray-700/40'
                    }`}
                  >
                    {project.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className='rounded-2xl border border-gray-700/60 bg-gray-900/60 p-4 text-sm text-gray-200'>
            <div className='flex items-center justify-between'>
              <p className='text-xs uppercase tracking-[0.2em] text-gray-500'>
                Conversations
              </p>
              <button
                type='button'
                onClick={handleCreateThread}
                className='rounded-full border border-gray-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-200 hover:border-gray-500 hover:text-white'
              >
                Nouveau
              </button>
            </div>
            <input
              type='text'
              value={newThreadTitle}
              onChange={event => setNewThreadTitle(event.target.value)}
              placeholder='Titre de conversation (optionnel)'
              className='mt-2 w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-100 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30'
            />
            <div className='mt-3 space-y-2'>
              {loadingThreads ? (
                <p className='text-xs text-gray-500'>Chargement...</p>
              ) : threads.length === 0 ? (
                <p className='text-xs text-gray-500'>
                  Aucune conversation pour le moment
                </p>
              ) : (
                threads.map(thread => (
                  <div
                    key={thread.id}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                      selectedThreadId === thread.id
                        ? 'bg-teal-500/20 text-teal-100'
                        : 'text-gray-300 hover:bg-gray-700/40'
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
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl'>
            <h4 className='text-base font-semibold text-gray-900'>
              Supprimer la conversation
            </h4>
            <p className='mt-2 text-sm text-gray-600'>
              Cette action est irréversible.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50'
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
    </aside>
  );
}

export default Aside;
