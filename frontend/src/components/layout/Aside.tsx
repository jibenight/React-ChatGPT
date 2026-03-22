import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, ChevronRight, HardDrive, User, Lock } from 'lucide-react';
import { useUser } from '@/UserContext';
import chatGPT from '@/assets/chatGPT.mp4';
import * as tauri from '@/tauriClient';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/hooks/useTheme';
import SidebarProviderPicker from './SidebarProviderPicker';
import SidebarModeToggle from './SidebarModeToggle';
import SidebarProjectList from './SidebarProjectList';
import SidebarThreadList from './SidebarThreadList';
import ProjectFormPanel from './ProjectFormPanel';
import SidebarSearch from './SidebarSearch';

const isTauri = '__TAURI_INTERNALS__' in window;

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

  const { t, i18n } = useTranslation();
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
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const providerAvatar = selectedOption?.avatar || chatGPT;
  const activeProject = projects.find((project) => project.id === selectedProjectId);

  // Click-outside to close settings popover
  useEffect(() => {
    if (!showSettings) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await tauri.listProjects();
      setProjects(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchThreads = async (projectId) => {
    setLoadingThreads(true);
    try {
      const data = await tauri.listThreads(projectId);
      setThreads(data || []);
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
      const thread = await tauri.createThread({
        title: newThreadTitle || undefined,
        project_id: targetProjectId || undefined,
      });
      setNewThreadTitle('');
      await fetchThreads(projectMode ? targetProjectId : null);
      if (thread?.id) {
        setSelectedThreadId(thread.id);
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
    <aside className='relative flex h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white text-gray-900 dark:border-white/[0.06] dark:bg-sidebar dark:text-foreground'>
      {/* Header compact */}
      <div className='flex items-center gap-3 px-4 pt-3 pb-1'>
        {selectedOption?.avatar ? (
          <video
            src={providerAvatar}
            autoPlay
            muted
            loop
            playsInline
            className='h-7 w-7 rounded-md object-cover'
          />
        ) : (
          <div className='flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/15'>
            <HardDrive className='h-4 w-4 text-teal-500' />
          </div>
        )}
        <p className='min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-foreground'>
          {hasUserData ? userData.username : t('common:loading')}
        </p>
        <button
          type='button'
          onClick={() => setShowSettings((prev) => !prev)}
          className='ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-card dark:hover:text-foreground'
          title={t('common:settings')}
        >
          <Settings className='h-4 w-4' />
        </button>
      </div>

      {/* Settings popover */}
      {showSettings && (
        <div
          ref={settingsRef}
          className='absolute left-4 right-4 top-[52px] z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-border dark:bg-card'
        >
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-gray-700 dark:text-foreground'>
              {isDark ? t('common:themeDark') : t('common:themeLight')}
            </span>
            <button
              type='button'
              onClick={toggleTheme}
              aria-pressed={isDark}
              className={`relative inline-flex h-6 w-10 items-center rounded-full border transition ${
                isDark
                  ? 'border-teal-400/40 bg-teal-500/25'
                  : 'border-gray-300 bg-gray-100 dark:border-border dark:bg-background/90'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
                  isDark ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div className='my-2.5 border-t border-gray-200 dark:border-border' />
          <div className='flex flex-col gap-1.5'>
            <span className='text-xs font-semibold text-gray-700 dark:text-foreground'>
              {t('common:language')} — {({ fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', pt: 'Português', ja: '日本語', ko: '한국어' })[i18n.language?.slice(0, 2)] ?? i18n.language}
            </span>
            <div className='flex flex-wrap gap-1'>
              {(['fr', 'en', 'es', 'de', 'pt', 'ja', 'ko'] as const).map((lang) => {
                const isActive = i18n.language?.startsWith(lang);
                return (
                  <button
                    key={lang}
                    type='button'
                    onClick={() => i18n.changeLanguage(lang)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide transition ${
                      isActive
                        ? 'border-teal-400/60 bg-teal-500/20 text-teal-700 dark:border-teal-400/40 dark:text-teal-300'
                        : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-border dark:bg-background dark:text-muted-foreground dark:hover:border-border dark:hover:text-foreground'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>
          {isTauri && (
            <>
              <div className='my-2.5 border-t border-gray-200 dark:border-border' />
              <button
                type='button'
                onClick={() => {
                  setShowSettings(false);
                  window.dispatchEvent(new Event('lock-app'));
                }}
                className='flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-foreground dark:hover:bg-background'
              >
                <Lock className='h-3.5 w-3.5' />
                {t('common:lock')}
              </button>
            </>
          )}
        </div>
      )}

      <SidebarSearch />

      <SidebarModeToggle />

      <div className='flex-1 min-h-0 px-4 pb-2 pt-2'>
        <div className='flex h-full min-h-0 flex-col gap-2'>
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

      {/* Provider row compact */}
      <div className='px-4 pb-2'>
        <button
          type='button'
          onClick={openPicker}
          className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-card'
        >
          {selectedOption?.avatar ? (
            <video
              src={providerAvatar}
              autoPlay
              muted
              loop
              playsInline
              className='h-5 w-5 rounded-full object-cover'
            />
          ) : (
            <div className='flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/15'>
              <HardDrive className='h-3 w-3 text-teal-500' />
            </div>
          )}
          <span className='truncate text-xs font-semibold text-gray-700 dark:text-foreground'>
            {selectedOption?.name || t('chat:chooseProvider')}
          </span>
          <ChevronRight className='ml-auto h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground' />
        </button>
      </div>

      <div className='border-t border-gray-200 px-4 py-2.5 dark:border-white/[0.06]'>
        <button
          type='button'
          onClick={() => setProfil(!profil)}
          className='flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground'
        >
          <User className='h-4 w-4' />
          {t('profile:profile')}
        </button>
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
