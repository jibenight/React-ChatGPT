import logoutAnime from '../../assets/logout.gif';
import logout from '../../assets/logout.webp';
import profilImg from '../../assets/profil.webp';
import profilAnime from '../../assets/profil.gif';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LogOut({ setProfil, profil }) {
  const navigate = useNavigate();
  const [images, setImages] = useState({
    logoutSrc: logout,
    profilSrc: profilImg,
  });

  // pour changer l'image quand on passe la souris dessus
  const handleMouseOver = key => {
    if (key === 'logoutSrc') {
      setImages({ ...images, logoutSrc: logoutAnime });
    } else if (key === 'profilSrc') {
      setImages({ ...images, profilSrc: profilAnime });
    }
  };
  // pour changer l'image quand on sort la souris
  const handleMouseOut = key => {
    if (key === 'logoutSrc') {
      setImages({ ...images, logoutSrc: logout });
    } else if (key === 'profilSrc') {
      setImages({ ...images, profilSrc: profilImg });
    }
  };

  // pour se déconnecter
  const handleLogout = () => {
    // Supprimez les informations d'authentification stockées localement
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirigez l'utilisateur vers la page de connexion
    navigate('/login');
  };

  // pour afficher ou masquer le Profil
  const toggleProfil = () => {
    setProfil(!profil);
  };

  return (
    <div className='flex justify-evenly w-full'>
      <div className='flex flex-col items-center'>
        <div className='flex items-center justify-center rounded-full bg-white h-12 w-12'>
          <button onClick={toggleProfil}>
            <img
              src={images.profilSrc}
              alt='icon for log out'
              className='h-9 w-9 rounded-full'
              onMouseOver={() => handleMouseOver('profilSrc')}
              onMouseOut={() => handleMouseOut('profilSrc')}
            />
          </button>
        </div>
        <p className='mr-2 text-white italic text-lg'>Profil</p>
      </div>
      <div className='flex flex-col items-center'>
        <div className='flex items-center justify-center rounded-full bg-white h-12 w-12'>
          <button onClick={handleLogout}>
            <img
              src={images.logoutSrc}
              alt='icon for log out'
              className='h-8 w-8'
              onMouseOver={() => handleMouseOver('logoutSrc')}
              onMouseOut={() => handleMouseOut('logoutSrc')}
            />
          </button>
        </div>
        <p className='mr-2 text-white italic text-lg'>Log Out</p>
      </div>
    </div>
  );
}

export default LogOut;
