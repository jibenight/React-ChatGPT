import './css/App.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Aside from './components/layout/Aside';
import ChatZone from './features/chat/ChatZone';
import Profil from './features/profile/Profile';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { API_BASE } from './apiConfig';

function App() {
  const [profil, setProfil] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sessionId] = useState(() => uuidv4());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [projectMode, setProjectMode] = useState(() => {
    const stored = localStorage.getItem('project_mode');
    if (!stored) return true;
    return stored === 'project';
  });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    localStorage.setItem('project_mode', projectMode ? 'project' : 'solo');
  }, [projectMode]);

  useEffect(() => {
    if (!projectMode) return;
    if (selectedProjectId) return;
    let isActive = true;
    const token = localStorage.getItem('token');
    if (!token) return;
    const loadLastProjectThread = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/threads`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      const token = localStorage.getItem('token');
      if (!token) return undefined;
      const loadLastProjectThread = async () => {
        try {
          const response = await axios.get(`${API_BASE}/api/threads`, {
            headers: { Authorization: `Bearer ${token}` },
          });
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
    <main className='flex h-screen'>
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
      {profil ? (
        <Profil />
      ) : (
        <ChatZone
          selectedOption={selectedOption}
          sessionId={sessionId}
          threadId={selectedThreadId}
          projectId={selectedProjectId}
          onThreadChange={setSelectedThreadId}
        />
      )}
    </main>
  );
}

export default App;
