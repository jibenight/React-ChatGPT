// PrivateRoute.js
import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from './UserContext';

const DEV_BYPASS_AUTH =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';

const getOrCreateDevUser = () => {
  const stored = localStorage.getItem('dev_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore invalid storage
    }
  }
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}`;
  const user = {
    id,
    username: 'Dev User',
    email: `dev+${id}@local`,
  };
  localStorage.setItem('dev_user', JSON.stringify(user));
  return user;
};

const PrivateRoute = () => {
  const { setUserData } = useUser();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!DEV_BYPASS_AUTH) return;
    const user = getOrCreateDevUser();
    localStorage.setItem('user', JSON.stringify(user));
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'dev');
    }
    setUserData(user);
    axios.defaults.headers.common['X-Dev-User-Id'] = user.id;
    axios.defaults.headers.common['X-Dev-User-Name'] = user.username;
    axios.defaults.headers.common['X-Dev-User-Email'] = user.email;
  }, [setUserData]);

  if (DEV_BYPASS_AUTH) {
    return <Outlet />;
  }

  return token ? <Outlet /> : <Navigate to='/login' replace />;
};

export default PrivateRoute;
