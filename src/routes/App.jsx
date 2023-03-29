import { useState } from 'react';
import Aside from '../component/Aside';
import ChatZone from '../component/ChatZone';
import '../css/App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className='grid grid-cols-main'>
      <Aside />
      <ChatZone />
    </main>
  );
}

export default App;
