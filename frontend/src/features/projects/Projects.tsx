import React, { useEffect, useState } from 'react';
import apiClient from '../../apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../UserContext';
import { Users, X } from 'lucide-react';
import ProjectListSkeleton from '@/components/ui/ProjectListSkeleton';
import ThreadListSkeleton from '@/components/ui/ThreadListSkeleton';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner:
    'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200',
  editor:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  viewer:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function Projects() {
  const DEV_BYPASS_AUTH =
    import.meta.env.DEV &&
    String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';
  const navigate = useNavigate();
  const { userData } = useUser();
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

  // ── Members state ───────────────────────────────────────────────────
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [confirmMemberRemove, setConfirmMemberRemove] = useState<{
    open: boolean;
    userId: number | null;
    username: string;
  }>({ open: false, userId: null, username: '' });

  const isOwner = selectedProject?.member_role === 'owner';
  const canEdit =
    selectedProject?.member_role === 'owner' ||
    selectedProject?.member_role === 'editor';

  const loadProjects = async () => {
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
      const response = await apiClient.get(`/api/projects/${projectId}/threads`);
      setThreads(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMembers = async (projectId) => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/members`);
      setMembers(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      setThreads([]);
      setMembers([]);
      setEditingThreadId(null);
      setEditingThreadTitle('');
      return;
    }
    loadThreads(selectedProject.id);
    loadMembers(selectedProject.id);
  }, [selectedProject]);

  const handleCreate = async () => {
    if (!newProject.name.trim()) return;
    try {
      const response = await apiClient.post('/api/projects', newProject);
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
    if (!selectedProject) return;
    try {
      await apiClient.patch(`/api/projects/${selectedProject.id}`, editProject);
      setStatus({ type: 'success', text: 'Projet mis à jour.' });
      await loadProjects();
      const refreshed = projects.find(item => item.id === selectedProject.id);
      if (refreshed) {
        setSelectedProject(refreshed);
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.status === 403
          ? 'Permission refusée.'
          : 'Impossible de mettre à jour le projet.';
      setStatus({ type: 'error', text: msg });
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await apiClient.delete(`/api/projects/${selectedProject.id}`);
      setSelectedProject(null);
      setStatus({ type: 'success', text: 'Projet supprimé.' });
      await loadProjects();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.status === 403
          ? 'Permission refusée.'
          : 'Impossible de supprimer le projet.';
      setStatus({ type: 'error', text: msg });
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!selectedProject) return;
    try {
      await apiClient.delete(`/api/threads/${threadId}`);
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
      await apiClient.patch(`/api/threads/${threadId}`, {
        title: editingThreadTitle,
      });
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

  // ── Members handlers ────────────────────────────────────────────────
  const handleInviteMember = async () => {
    if (!selectedProject || !inviteEmail.trim()) return;
    try {
      await apiClient.post(`/api/projects/${selectedProject.id}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('viewer');
      setStatus({ type: 'success', text: 'Membre invité.' });
      await loadMembers(selectedProject.id);
    } catch (err: any) {
      console.error(err);
      const serverMsg = err?.response?.data?.error;
      let msg = 'Impossible d\'inviter ce membre.';
      if (serverMsg === 'User not found') msg = 'Utilisateur introuvable.';
      else if (serverMsg === 'User is already a member') msg = 'Cet utilisateur est déjà membre.';
      else if (serverMsg === 'Cannot add yourself as member') msg = 'Vous ne pouvez pas vous inviter vous-même.';
      setStatus({ type: 'error', text: msg });
    }
  };

  const handleChangeMemberRole = async (targetUserId: number, newRole: string) => {
    if (!selectedProject) return;
    try {
      await apiClient.patch(
        `/api/projects/${selectedProject.id}/members/${targetUserId}`,
        { role: newRole },
      );
      setStatus({ type: 'success', text: 'Rôle mis à jour.' });
      await loadMembers(selectedProject.id);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de modifier le rôle.' });
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    if (!selectedProject) return;
    try {
      await apiClient.delete(
        `/api/projects/${selectedProject.id}/members/${targetUserId}`,
      );
      setStatus({ type: 'success', text: 'Membre retiré.' });
      await loadMembers(selectedProject.id);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Impossible de retirer le membre.' });
    }
  };

  return (
    <div className='relative h-screen flex-1 overflow-y-auto bg-linear-to-br from-gray-50 via-white to-gray-100 text-gray-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100'>
      <div className='absolute right-6 top-6'>
        <button
          type='button'
          onClick={() => navigate('/chat')}
          className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-200'
        >
          Fermer
        </button>
      </div>
      <div className='mx-auto max-w-6xl px-4 py-10'>
        <div className='mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400'>
              Projets
            </p>
            <h1 className='text-3xl font-semibold text-gray-900 dark:text-slate-100'>
              Espace projets
            </h1>
            <p className='text-sm text-gray-500 dark:text-slate-300'>
              Gérer les instructions et le contexte de chaque projet.
            </p>
          </div>
          {DEV_BYPASS_AUTH && (
            <span className='w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
              Dev mode
            </span>
          )}
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
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
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
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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
                className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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
                className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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

          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
                Vos projets
              </h2>
            </div>
            <div className='mt-4 grid gap-3'>
              {loadingProjects ? (
                <ProjectListSkeleton />
              ) : projects.length === 0 ? (
                <p className='text-sm text-gray-500 dark:text-slate-400'>
                  Aucun projet pour le moment.
                </p>
              ) : null}
              {!loadingProjects && projects.map(project => (
                <div
                  key={project.id}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedProject?.id === project.id
                        ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-teal-200 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-teal-500/40 dark:hover:bg-teal-500/10'
                    }`}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedProject(project)}
                    className='w-full text-left'
                  >
                    <div className='flex items-center gap-2'>
                      <p className='font-semibold'>{project.name}</p>
                      {project.member_role && project.member_role !== 'owner' && (
                        <span className='inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'>
                          <Users className='h-3 w-3' />
                          Partagé
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-gray-500 dark:text-slate-400'>
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
              <div className='mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/60'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-slate-200'>
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
                    disabled={!canEdit}
                    className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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
                    disabled={!canEdit}
                    className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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
                    disabled={!canEdit}
                    className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
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
                    disabled={!canEdit}
                    className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
                  />
                  <div className='flex flex-wrap gap-2'>
                    {canEdit && (
                      <button
                        type='button'
                        onClick={handleUpdate}
                        className='rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600'
                      >
                        Enregistrer
                      </button>
                    )}
                    {isOwner && (
                      <button
                        type='button'
                        onClick={() => setConfirmProjectDelete(true)}
                        className='rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                      >
                        Supprimer le projet
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Section Membres ─────────────────────────────────── */}
                <div className='mt-6 border-t border-gray-200 pt-4 dark:border-slate-800'>
                  <h4 className='text-sm font-semibold text-gray-700 dark:text-slate-200'>
                    Membres
                  </h4>

                  {/* Invite form (owner only) */}
                  {isOwner && (
                    <div className='mt-3 flex flex-wrap items-end gap-2'>
                      <input
                        type='email'
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder='Email du membre'
                        className='flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
                      />
                      <select
                        value={inviteRole}
                        onChange={e =>
                          setInviteRole(e.target.value as 'editor' | 'viewer')
                        }
                        className='rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
                      >
                        <option value='viewer'>Viewer</option>
                        <option value='editor'>Editor</option>
                      </select>
                      <button
                        type='button'
                        onClick={handleInviteMember}
                        className='rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600'
                      >
                        Inviter
                      </button>
                    </div>
                  )}

                  {/* Members list */}
                  <div className='mt-3 space-y-2'>
                    {loadingMembers ? (
                      <p className='text-xs text-gray-500 dark:text-slate-400'>
                        Chargement...
                      </p>
                    ) : members.length === 0 ? (
                      <p className='text-xs text-gray-500 dark:text-slate-400'>
                        Aucun membre.
                      </p>
                    ) : (
                      members.map(member => (
                        <div
                          key={member.user_id}
                          className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900'
                        >
                          <div className='flex items-center gap-2'>
                            <span className='font-semibold text-gray-700 dark:text-slate-200'>
                              {member.username}
                            </span>
                            <span className='text-gray-400 dark:text-slate-500'>
                              {member.email}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                ROLE_BADGE_CLASSES[member.role] || ROLE_BADGE_CLASSES.viewer
                              }`}
                            >
                              {ROLE_LABELS[member.role] || member.role}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            {isOwner &&
                              member.user_id !== userData?.id &&
                              member.role !== 'owner' && (
                                <>
                                  <select
                                    value={member.role}
                                    onChange={e =>
                                      handleChangeMemberRole(
                                        member.user_id,
                                        e.target.value,
                                      )
                                    }
                                    className='rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                                  >
                                    <option value='editor'>Editor</option>
                                    <option value='viewer'>Viewer</option>
                                  </select>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      setConfirmMemberRemove({
                                        open: true,
                                        userId: member.user_id,
                                        username: member.username,
                                      })
                                    }
                                    title='Retirer le membre'
                                    className='rounded-md p-1 text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-200'
                                  >
                                    <X className='h-3.5 w-3.5' />
                                  </button>
                                </>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── Section Conversations ───────────────────────────── */}
                <div className='mt-6 border-t border-gray-200 pt-4 dark:border-slate-800'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-sm font-semibold text-gray-700 dark:text-slate-200'>
                      Conversations
                    </h4>
                  </div>
                  <div className='mt-3 space-y-2'>
                    {loadingThreads ? (
                      <ThreadListSkeleton />
                    ) : threads.length === 0 ? (
                      <p className='text-xs text-gray-500 dark:text-slate-400'>
                        Aucune conversation pour ce projet.
                      </p>
                    ) : (
                      threads.map(thread => {
                        const isEditing = editingThreadId === thread.id;
                        return (
                          <div
                            key={thread.id}
                            className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900'
                          >
                            {isEditing ? (
                              <input
                                type='text'
                                value={editingThreadTitle}
                                onChange={event =>
                                  setEditingThreadTitle(event.target.value)
                                }
                                placeholder='Titre de conversation'
                                className='mr-3 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-400/30'
                              />
                            ) : (
                              <span className='font-semibold text-gray-700 dark:text-slate-200'>
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
                                    className='text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
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
                                    className='text-xs font-semibold text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-slate-100'
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
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 dark:shadow-none'>
            <h4 className='text-base font-semibold text-gray-900 dark:text-slate-100'>
              Supprimer le projet
            </h4>
            <p className='mt-2 text-sm text-gray-600 dark:text-slate-300'>
              Ce projet sera supprimé et ses conversations détachées. Action
              irréversible.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
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

      {/* ── Modal: confirm member remove ──────────────────────────────── */}
      {confirmMemberRemove.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 dark:shadow-none'>
            <h4 className='text-base font-semibold text-gray-900 dark:text-slate-100'>
              Retirer le membre
            </h4>
            <p className='mt-2 text-sm text-gray-600 dark:text-slate-300'>
              Retirer {confirmMemberRemove.username} de ce projet ?
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                onClick={() =>
                  setConfirmMemberRemove({
                    open: false,
                    userId: null,
                    username: '',
                  })
                }
              >
                Annuler
              </button>
              <button
                type='button'
                className='rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700'
                onClick={() => {
                  const target = confirmMemberRemove.userId;
                  setConfirmMemberRemove({
                    open: false,
                    userId: null,
                    username: '',
                  });
                  if (target) {
                    handleRemoveMember(target);
                  }
                }}
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
