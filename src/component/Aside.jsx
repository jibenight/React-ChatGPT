import { useState, useEffect } from 'react';
import chatGPT from '../assets/chatGPT.mp4';
import Aioption from './Aioption';
import LogOut from './Logout';
import { useUser } from '../UserContext';

function Aside({ setProfil, profil }) {
  const [selectedOption, setSelectedOption] = useState(profil);
  const { userData } = useUser();

  const handleMessageSend = message => {
    // Ici, vous pouvez appeler la fonction `fetch` pour envoyer les données au backend
    // Utilisez selectedOption.id pour obtenir l'identifiant du modèle sélectionné
    fetch('/api/openai/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId, // Assurez-vous que vous avez une variable userId valide
        sessionId: sessionId, // Assurez-vous que vous avez une variable sessionId valide
        message: message,
        modelId: selectedOption.id, // Utilisez l'identifiant du modèle sélectionné
      }),
    })
      .then(response => response.json())
      .then(data => {
        // Ajoutez le message utilisateur et la réponse de l'IA à l'état messages
        setMessages(prevMessages => [
          ...prevMessages,
          { type: 'user', content: message },
          { type: 'ai', content: data.message },
        ]);
      });
  };

  function handleSelectOption(option) {
    setSelectedOption(option);
  }

  // Vérifiez si userData existe et contient un username
  const hasUserData = userData && userData.username;

  return (
    <div className='bg-gray-800 w-100 h-screen divide-y divide-gray-100 flex flex-col'>
      <div className='m-3 mt-5 mb-10'>
        <div className='m-3 flex items-center justify-center'>
          <video
            src={selectedOption.avatar || chatGPT}
            autoPlay={true}
            className='h-20 w-20 flex-shrink-0 rounded-full'
          />
        </div>

        {/* N'affichez le texte d'accueil que si userData est disponible */}
        {hasUserData ? (
          <h1 className='text-gray-100 text-2xl italic text-center'>
            Hello, {userData.username}
          </h1>
        ) : (
          <h1 className='text-gray-100 text-2xl italic text-center'>
            Loading...
          </h1>
        )}
      </div>

      <div className='m-3 flex-grow'>
        <Aioption setSelectedOption={handleSelectOption} />
      </div>

      <div className=' flex justify-center items-center m-3 p-3'>
        <LogOut setProfil={setProfil} profil={profil} />
      </div>
    </div>
  );
}

export default Aside;
