import '../css/App.css';
import { useState } from 'react';
import Aside from '../component/Aside';
import ChatZone from '../component/ChatZone';
import Profil from '../component/Profil';

function App() {
  const [profil, setProfil] = useState(false);

  return (
    <main className='grid grid-cols-main'>
      <Aside setProfil={setProfil} profil={profil} />
      {profil ? <Profil /> : <ChatZone />}
    </main>
  );
}

export default App;
