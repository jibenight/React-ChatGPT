import { User, LogOut as LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import { useUser } from '../../UserContext';

function LogOut({ setProfil }) {
  const navigate = useNavigate();
  const { setUserData } = useUser();

  // pour se déconnecter
  const handleLogout = async () => {
    try {
      await apiClient.post('/logout');
    } catch {
      // Ignore logout network errors and clear local state anyway.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserData({});
    navigate('/login');
  };

  // pour afficher ou masquer le Profil
  const toggleProfil = () => {
    setProfil(prev => !prev);
  };

  return (
    <div className='flex w-full justify-evenly'>
      <button
        type='button'
        onClick={toggleProfil}
        className='flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground'
      >
        <User className='h-4 w-4' />
        Profil
      </button>
      <button
        type='button'
        onClick={handleLogout}
        className='flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground'
      >
        <LogOutIcon className='h-4 w-4' />
        Quitter
      </button>
    </div>
  );
}

export default LogOut;
