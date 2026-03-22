import i18n from '@/i18n';
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
import UpgradeModal from '@/features/billing/UpgradeModal';
import { usePlanStore } from '@/stores/planStore';
import { checkStatus } from '@choochmeque/tauri-plugin-biometry-api';
import { getUser } from '@/tauriClient';

const isTauri = '__TAURI_INTERNALS__' in window;

const UserGuide = lazy(() => import('./features/info/UserGuide'));
const PricingPage = lazy(() => import('./features/billing/PricingPage'));
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));
const BillingSuccess = lazy(() => import('./features/billing/BillingSuccess'));
const PrivateRoute = lazy(() => import('./features/auth/PrivateRoute'));

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

function AppGate() {
  const [unlocked, setUnlocked] = useState(!isTauri);
  const [checking, setChecking] = useState(isTauri);
  const [username, setUsername] = useState('');
  const fetchPlan = usePlanStore(s => s.fetchPlan);

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

  // Charger le plan dès que l'utilisateur est authentifié (web uniquement)
  useEffect(() => {
    if (isTauri) return;
    const storedUser = localStorage.getItem('user');
    let isLoggedIn = false;
    try {
      isLoggedIn = !!(storedUser && (JSON.parse(storedUser)?.id ?? false));
    } catch {
      // JSON invalide : considérer comme non connecté
    }
    if (isLoggedIn) {
      fetchPlan().catch(() => null);
    }
  }, [fetchPlan]);

  // Listen for lock event from sidebar logout button
  useEffect(() => {
    if (!isTauri) return;
    window.addEventListener('lock-app', handleLock);
    return () => window.removeEventListener('lock-app', handleLock);
  }, [handleLock]);

  if (checking) return null;

  // Tauri desktop: biometric lock screen + app routes (no auth pages needed)
  if (isTauri) {
    if (!unlocked) {
      return <LockScreen onUnlocked={handleUnlocked} currentUsername={username} />;
    }
    return (
      <Router>
        <Suspense fallback={<div>{i18n.t('common:loading')}</div>}>
          <Routes>
            <Route path='/' element={<App />} />
            <Route path='/chat' element={<App />} />
            <Route path='/projects' element={<App />} />
            <Route path='/guide' element={<UserGuide />} />
            <Route path='/pricing' element={<PricingPage />} />
          </Routes>
          <UpgradeModal />
        </Suspense>
      </Router>
    );
  }

  // Web: public routes + protected routes with auth guard
  return (
    <Router>
      <Suspense fallback={<div>{i18n.t('common:loading')}</div>}>
        <Routes>
          {/* Public routes */}
          <Route path='/' element={<LandingPage />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/reset-password' element={<ResetPasswordPage />} />
          <Route path='/pricing' element={<PricingPage />} />
          <Route path='/guide' element={<UserGuide />} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path='/chat' element={<App />} />
            <Route path='/projects' element={<App />} />
            <Route path='/billing/success' element={<BillingSuccess />} />
          </Route>
        </Routes>
        <UpgradeModal />
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
