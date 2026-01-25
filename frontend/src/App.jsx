import './css/App.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Aside from './components/layout/Aside';
import ChatZone from './features/chat/ChatZone';
import Profil from './features/profile/Profile';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [profil, setProfil] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sessionId] = useState(() => uuidv4());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const projectParam = searchParams.get('projectId');
    const threadParam = searchParams.get('threadId');
    if (projectParam !== null) {
      const parsed = Number(projectParam);
      setSelectedProjectId(Number.isNaN(parsed) ? null : parsed);
      if (!threadParam) {
        setSelectedThreadId(null);
      }
    }
    if (threadParam) {
      setSelectedThreadId(threadParam);
    }
  }, [searchParams]);

  return (
    <main className='flex h-screen'>
      <Aside
        setProfil={setProfil}
        profil={profil}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
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
