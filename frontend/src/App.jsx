import './css/App.css';
import { useState } from 'react';
import Aside from './components/layout/Aside';
import ChatZone from './features/chat/ChatZone';
import Profil from './features/profile/Profile';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [profil, setProfil] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sessionId] = useState(() => uuidv4());

  return (
    <main className='flex h-screen'>
      <Aside
        setProfil={setProfil}
        profil={profil}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      {profil ? (
        <Profil />
      ) : (
        <ChatZone selectedOption={selectedOption} sessionId={sessionId} />
      )}
    </main>
  );
}

export default App;
