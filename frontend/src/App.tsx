import './css/App.css';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Aside from './components/layout/Aside';
import ChatZone from './features/chat/ChatZone';
import Profil from './features/profile/Profile';
import Projects from './features/projects/Projects';
import { v4 as uuidv4 } from 'uuid';
import apiClient from './apiClient';

function App() {
  const [profil, setProfil] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [projectMode, setProjectMode] = useState(() => {
    const stored = localStorage.getItem('project_mode');
    if (!stored) return true;
    return stored === 'project';
  });
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const showProjects = location.pathname.startsWith('/projects');

  useEffect(() => {
    localStorage.setItem('project_mode', projectMode ? 'project' : 'solo');
  }, [projectMode]);

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
      <Aside
        setProfil={setProfil}
        profil={profil}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        projectMode={projectMode}
        setProjectMode={setProjectMode}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        selectedThreadId={selectedThreadId}
        setSelectedThreadId={setSelectedThreadId}
      />
      <div className={profil ? 'hidden' : 'flex-1 min-h-0'}>
        {showProjects ? (
          <Projects />
        ) : (
          <ChatZone
            selectedOption={selectedOption}
            sessionId={sessionId}
            threadId={selectedThreadId}
            projectId={selectedProjectId}
            onThreadChange={setSelectedThreadId}
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
