import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';
import { Link } from 'react-router-dom';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [confirmThreadDelete, setConfirmThreadDelete] = useState({
    open: false,
    threadId: null,
  });
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
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
  const [status, setStatus] = useState(null);

  const token = localStorage.getItem('token');

  const loadProjects = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(response.data || []);
    } catch (err) {
      console.error(err);
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

  const loadThreads = async projectId => {
    if (!token || !projectId) return;
    setLoadingThreads(true);
    try {
      const response = await axios.get(
        `${API_BASE}/api/projects/${projectId}/threads`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setThreads(response.data || []);
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
  }, [selectedProject]);

  const handleCreate = async () => {
    if (!token || !newProject.name.trim()) return;
    try {
      const response = await axios.post(
        `${API_BASE}/api/projects`,
        newProject,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNewProject({
        name: '',
        description: '',
        instructions: '',
        context_data: '',
      });
      setStatus({ type: 'success', text: 'Projet créé.' });
      await loadProjects();
      if (response.data?.id) {
        const created = {
          ...response.data,
          id: response.data.id,
        };
        setSelectedProject(created);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de créer le projet.' });
    }
  };

  const handleUpdate = async () => {
    if (!token || !selectedProject) return;
    try {
      await axios.patch(
        `${API_BASE}/api/projects/${selectedProject.id}`,
        editProject,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStatus({ type: 'success', text: 'Projet mis à jour.' });
      await loadProjects();
      const refreshed = projects.find(item => item.id === selectedProject.id);
      if (refreshed) {
        setSelectedProject(refreshed);
      }
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        text: 'Impossible de mettre à jour le projet.',
      });
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedProject) return;
    try {
      await axios.delete(`${API_BASE}/api/projects/${selectedProject.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedProject(null);
      setStatus({ type: 'success', text: 'Projet supprimé.' });
      await loadProjects();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de supprimer le projet.' });
    }
  };

  const handleDeleteThread = async threadId => {
    if (!token || !selectedProject) return;
    try {
      await axios.delete(`${API_BASE}/api/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadThreads(selectedProject.id);
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        text: 'Impossible de supprimer la conversation.',
      });
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
    if (!token || !selectedProject) return;
    try {
      await axios.patch(
        `${API_BASE}/api/threads/${threadId}`,
        { title: editingThreadTitle },
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
    <div className='min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100'>
      <div className='mx-auto max-w-6xl px-4 py-10'>
        <div className='mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400'>
              Projets
            </p>
            <h1 className='text-3xl font-semibold text-gray-900'>
              Espace projets
            </h1>
            <p className='text-sm text-gray-500'>
              Gérer les instructions et le contexte de chaque projet.
            </p>
          </div>
        </div>

        {status && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {status.text}
          </div>
        )}

        <div className='grid gap-6 lg:grid-cols-[1.1fr_1.4fr]'>
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900'>
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
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                placeholder="Instructions pour l\'IA (optionnel)"
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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

          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Vos projets
              </h2>
            </div>
            <div className='mt-4 grid gap-3'>
              {projects.length === 0 && (
                <p className='text-sm text-gray-500'>
                  Aucun projet pour le moment.
                </p>
              )}
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selectedProject?.id === project.id
                      ? 'border-teal-200 bg-teal-50 text-teal-700'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-teal-200 hover:bg-teal-50'
                  }`}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedProject(project)}
                    className='w-full text-left'
                  >
                    <p className='font-semibold'>{project.name}</p>
                    <p className='text-xs text-gray-500'>
                      {project.description || 'Aucune description'}
                    </p>
                  </button>
                  <Link
                    to={`/chat?projectId=${project.id}`}
                    className='mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700'
                  >
                    Ouvrir dans le chat
                  </Link>
                </div>
              ))}
            </div>
            {selectedProject && (
              <div className='mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4'>
                <h3 className='text-sm font-semibold text-gray-700'>
                  Modifier le projet
                </h3>
                <Link
                  to={`/chat?projectId=${selectedProject.id}`}
                  className='mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700'
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
                    className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                    className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                    className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                    className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
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
                      className='rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                    >
                      Supprimer le projet
                    </button>
                  </div>
                </div>
                <div className='mt-6 border-t border-gray-200 pt-4'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-sm font-semibold text-gray-700'>
                      Conversations
                    </h4>
                  </div>
                  <div className='mt-3 space-y-2'>
                    {loadingThreads ? (
                      <p className='text-xs text-gray-500'>Chargement...</p>
                    ) : threads.length === 0 ? (
                      <p className='text-xs text-gray-500'>
                        Aucune conversation pour ce projet.
                      </p>
                    ) : (
                      threads.map(thread => {
                        const isEditing = editingThreadId === thread.id;
                        return (
                          <div
                            key={thread.id}
                            className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs'
                          >
                            {isEditing ? (
                              <input
                                type='text'
                                value={editingThreadTitle}
                                onChange={event =>
                                  setEditingThreadTitle(event.target.value)
                                }
                                placeholder='Titre de conversation'
                                className='mr-3 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                              />
                            ) : (
                              <span className='font-semibold text-gray-700'>
                                {thread.title || 'Conversation sans titre'}
                              </span>
                            )}
                            <div className='flex items-center gap-2'>
                              {isEditing ? (
                                <>
                                  <button
                                    type='button'
                                    onClick={() => handleRenameThread(thread.id)}
                                    className='text-xs font-semibold text-teal-600 hover:text-teal-700'
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    type='button'
                                    onClick={handleCancelRenameThread}
                                    className='text-xs font-semibold text-gray-500 hover:text-gray-700'
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Link
                                    to={`/chat?projectId=${selectedProject.id}&threadId=${thread.id}`}
                                    className='text-xs font-semibold text-teal-600 hover:text-teal-700'
                                  >
                                    Ouvrir
                                  </Link>
                                  <button
                                    type='button'
                                    onClick={() => handleStartRenameThread(thread)}
                                    className='text-xs font-semibold text-gray-600 hover:text-gray-800'
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
                                    className='text-xs font-semibold text-red-600 hover:text-red-700'
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
          <Link
            to='/chat'
            className='inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600'
          >
            Retour au chat
          </Link>
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

      {confirmProjectDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl'>
            <h4 className='text-base font-semibold text-gray-900'>
              Supprimer le projet
            </h4>
            <p className='mt-2 text-sm text-gray-600'>
              Ce projet sera supprimé et ses conversations détachées. Action
              irréversible.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50'
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
