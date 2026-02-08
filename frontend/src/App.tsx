import './css/App.css';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Aside from './components/layout/Aside';
import ChatZone from './features/chat/ChatZone';
import Profil from './features/profile/Profile';
import Projects from './features/projects/Projects';
import { v4 as uuidv4 } from 'uuid';
import apiClient from './apiClient';
import { useAppStore } from './stores/appStore';

function App() {
  const profil = useAppStore(s => s.profil);
  const selectedOption = useAppStore(s => s.selectedOption);
  const projectMode = useAppStore(s => s.projectMode);
  const setProjectMode = useAppStore(s => s.setProjectMode);
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const setSelectedProjectId = useAppStore(s => s.setSelectedProjectId);
  const selectedThreadId = useAppStore(s => s.selectedThreadId);
  const setSelectedThreadId = useAppStore(s => s.setSelectedThreadId);

  const [sessionId] = useState(() => uuidv4());
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const showProjects = location.pathname.startsWith('/projects');

  useEffect(() => {
    if (!projectMode) return;
    if (selectedProjectId) return;
    let isActive = true;
    const loadLastProjectThread = async () => {
      try {
         const response = await apiClient.get('/api/threads');
        const allThreads = response.data || [];
        const lastProjectThread = allThreads.find(
          thread => thread.project_id !== null && thread.project_id !== undefined,
        );
        if (isActive && lastProjectThread?.project_id) {
          setSelectedProjectId(lastProjectThread.project_id);
          setSelectedThreadId(lastProjectThread.id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Impossible de charger la dernière conversation');
      }
    };
    loadLastProjectThread();
    return () => {
      isActive = false;
    };
  }, [projectMode, selectedProjectId, setSelectedProjectId, setSelectedThreadId]);

  useEffect(() => {
    const projectParam = searchParams.get('projectId');
    const threadParam = searchParams.get('threadId');
    if (projectParam !== null) {
      const parsed = Number(projectParam);
      setProjectMode(true);
      setSelectedProjectId(Number.isNaN(parsed) ? null : parsed);
      if (!threadParam) {
        setSelectedThreadId(null);
      }
    }
    if (threadParam) {
      setSelectedThreadId(threadParam);
    }

    if (projectParam === null && !threadParam) {
      let isActive = true;
      const loadLastProjectThread = async () => {
        try {
           const response = await apiClient.get('/api/threads');
          const allThreads = response.data || [];
          const lastThread = allThreads.find(thread =>
            projectMode
              ? thread.project_id !== null && thread.project_id !== undefined
              : thread.project_id === null || thread.project_id === undefined,
          );
          if (isActive && lastThread) {
            setSelectedProjectId(projectMode ? lastThread.project_id : null);
            setSelectedThreadId(lastThread.id);
          }
        } catch (err) {
          console.error(err);
          toast.error('Impossible de charger les conversations');
        }
      };
      loadLastProjectThread();
      return () => {
        isActive = false;
      };
    }
    return undefined;
  }, [searchParams]);

  return (
    <main className='flex h-screen overflow-hidden'>
      <Aside />
      <div className={profil ? 'hidden' : 'flex-1 min-h-0'}>
        {showProjects ? (
          <Projects />
        ) : (
          <ChatZone
            sessionId={sessionId}
          />
        )}
      </div>
      <div className={profil ? 'flex-1 min-h-0' : 'hidden'}>
        <Profil />
      </div>
    </main>
  );
}

export default App;
