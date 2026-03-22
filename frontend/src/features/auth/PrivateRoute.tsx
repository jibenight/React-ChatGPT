import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@/UserContext';

const devBypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

export default function PrivateRoute() {
  const { userData } = useUser();

  if (devBypass) return <Outlet />;

  const storedUser = localStorage.getItem('user');
  let storedUserId: string | number | null = null;
  try {
    storedUserId = storedUser ? (JSON.parse(storedUser)?.id ?? null) : null;
  } catch {
    // JSON invalide : traiter comme non authentifié
  }
  const isAuthenticated = !!(userData?.id || storedUserId);

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  return <Outlet />;
}
