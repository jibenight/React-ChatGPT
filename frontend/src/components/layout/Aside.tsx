import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/UserContext';
import LogOut from '@/features/auth/Logout';
import chatGPT from '@/assets/chatGPT.mp4';
import apiClient from '@/apiClient';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/hooks/useTheme';
import SidebarProviderPicker from './SidebarProviderPicker';
import SidebarModeToggle from './SidebarModeToggle';
import SidebarProjectList from './SidebarProjectList';
import SidebarThreadList from './SidebarThreadList';
import ProjectFormPanel from './ProjectFormPanel';
import SidebarSearch from './SidebarSearch';

function Aside() {
  const profil = useAppStore((s) => s.profil);
  const setProfil = useAppStore((s) => s.setProfil);
  const selectedOption = useAppStore((s) => s.selectedOption);
  const projectMode = useAppStore((s) => s.projectMode);
  const setProjectMode = useAppStore((s) => s.setProjectMode);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId);
  const selectedThreadId = useAppStore((s) => s.selectedThreadId);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);

  const { i18n } = useTranslation();
  const { userData } = useUser();
  const { theme, toggleTheme } = useTheme();
  const hasUserData = userData && userData.username;
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [confirmThreadDelete, setConfirmThreadDelete] = useState({
    open: false,
    threadId: null,
  });
  const isDark = theme === 'dark';
  const providerAvatar = selectedOption?.avatar || chatGPT;
  const activeProject = projects.find((project) => project.id === selectedProjectId);

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

  const handleSelectProject = (projectId) => {
    setProjectMode(true);
    setSelectedProjectId(projectId);
    setSelectedThreadId(null);
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

  useEffect(() => {
    if (!projectMode) {
      setSelectedProjectId(null);
      setSelectedThreadId(null);
    }
    setShowProjectPanel(false);
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

  const refreshThreads = () => {
    fetchThreads(projectMode ? selectedProjectId : null);
  };

  if (showProviderPicker) {
    return <SidebarProviderPicker onClose={closePicker} />;
  }

  return (
    <aside className='relative flex h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'>
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

      <SidebarSearch />

      <SidebarModeToggle />

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
            onClick={toggleTheme}
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

      <div className='px-4 pt-2'>
        <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900'>
          <div>
            <p className='text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500'>
              Langue
            </p>
            <p className='text-sm font-semibold text-gray-900 dark:text-slate-100'>
              {i18n.language?.startsWith('fr') ? 'Français' : 'English'}
            </p>
          </div>
          <button
            type='button'
            onClick={() =>
              i18n.changeLanguage(i18n.language?.startsWith('fr') ? 'en' : 'fr')
            }
            className='rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-400 dark:hover:text-white'
          >
            {i18n.language?.startsWith('fr') ? 'EN' : 'FR'}
          </button>
        </div>
      </div>

      <div className='flex-1 min-h-0 px-4 pb-3 pt-3'>
        <div className='flex h-full min-h-0 flex-col gap-3'>
          <SidebarProjectList
            activeProject={activeProject}
            onOpenPanel={() => setShowProjectPanel(true)}
          />

          <SidebarThreadList
            threads={threads}
            projects={projects}
            loadingThreads={loadingThreads}
            newThreadTitle={newThreadTitle}
            setNewThreadTitle={setNewThreadTitle}
            onCreateThread={handleCreateThread}
            onRefreshThreads={refreshThreads}
            confirmThreadDelete={confirmThreadDelete}
            setConfirmThreadDelete={setConfirmThreadDelete}
          />
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

      <ProjectFormPanel
        show={showProjectPanel}
        onClose={() => setShowProjectPanel(false)}
        projects={projects}
        loadingProjects={loadingProjects}
        threads={threads}
        loadingThreads={loadingThreads}
        newThreadTitle={newThreadTitle}
        setNewThreadTitle={setNewThreadTitle}
        onCreateThread={handleCreateThread}
        onSelectProject={handleSelectProject}
        onRefreshProjects={fetchProjects}
        setConfirmThreadDelete={setConfirmThreadDelete}
      />
    </aside>
  );
}

export default Aside;
