import '@/i18n';
import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './css/App.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { UserProvider } from './UserContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LockScreen from '@/components/LockScreen';
import { checkStatus } from '@choochmeque/tauri-plugin-biometry-api';
import { getUser } from '@/tauriClient';

const UserGuide = lazy(() => import('./features/info/UserGuide'));

const applyInitialTheme = () => {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', Boolean(isDark));
  } catch {
    document.documentElement.classList.remove('dark');
  }
};

applyInitialTheme();

const isTauri = '__TAURI_INTERNALS__' in window;

function AppGate() {
  const [unlocked, setUnlocked] = useState(!isTauri);
  const [checking, setChecking] = useState(isTauri);
  const [username, setUsername] = useState('');

  const handleUnlocked = useCallback(() => setUnlocked(true), []);
  const handleLock = useCallback(() => setUnlocked(false), []);

  useEffect(() => {
    if (!isTauri) return;
    Promise.all([checkStatus(), getUser()])
      .then(([status, user]) => {
        setUsername(user.username);
        if (!status.isAvailable) setUnlocked(true);
      })
      .catch(() => setUnlocked(true))
      .finally(() => setChecking(false));
  }, []);

  // Listen for lock event from sidebar logout button
  useEffect(() => {
    if (!isTauri) return;
    window.addEventListener('lock-app', handleLock);
    return () => window.removeEventListener('lock-app', handleLock);
  }, [handleLock]);

  if (checking) return null;
  if (!unlocked)
    return <LockScreen onUnlocked={handleUnlocked} currentUsername={username} />;

  return (
    <Router>
      <Suspense fallback={<div>Chargement...</div>}>
        <Routes>
          <Route path='/' element={<App />} />
          <Route path='/chat' element={<App />} />
          <Route path='/projects' element={<App />} />
          <Route path='/guide' element={<UserGuide />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <AppGate />
      </TooltipProvider>
    </UserProvider>
  </ErrorBoundary>,
);
