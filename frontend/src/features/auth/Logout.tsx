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
    setProfil(prev => !prev);
  };

  return (
    <div className='flex justify-evenly w-full'>
      <button
        type='button'
        onClick={toggleProfil}
        className='flex flex-col items-center'
      >
        <span className='flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-800'>
          <img
            src={images.profilSrc}
            alt='Icône de profil'
            className='h-9 w-9 rounded-full'
            onMouseOver={() => handleMouseOver('profilSrc')}
            onMouseOut={() => handleMouseOut('profilSrc')}
          />
        </span>
        <span className='mr-2 text-lg italic text-white'>Profil</span>
      </button>
      <button
        type='button'
        onClick={handleLogout}
        className='flex flex-col items-center'
      >
        <span className='flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-800'>
          <img
            src={images.logoutSrc}
            alt='Icône de déconnexion'
            className='h-8 w-8'
            onMouseOver={() => handleMouseOver('logoutSrc')}
            onMouseOut={() => handleMouseOut('logoutSrc')}
          />
        </span>
        <span className='mr-2 text-lg italic text-white'>Déconnexion</span>
      </button>
    </div>
  );
}

export default LogOut;
