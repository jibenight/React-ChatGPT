import '@/i18n';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './css/App.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { UserProvider } from './UserContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const Login = lazy(() => import('./features/auth/Login'));
const Home = lazy(() => import('./features/chat/Home'));
const ResetPasswordRequest = lazy(() => import('./features/auth/ResetPasswordRequest'));
const ResetPassword = lazy(() => import('./features/auth/ResetPassword'));
const Register = lazy(() => import('./features/auth/Register'));
const VerifyEmail = lazy(() => import('./features/auth/VerifyEmail'));
const UserGuide = lazy(() => import('./features/info/UserGuide'));

const applyInitialTheme = () => {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', Boolean(isDark));
  } catch {
    // If localStorage is unavailable, fall back to light.
    document.documentElement.classList.remove('dark');
  }
};

applyInitialTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Router>
          <Suspense fallback={<div>Chargement...</div>}>
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/register' element={<Register />} />
              <Route path='/login' element={<Login />} />
              <Route
                path='/reset-password-request'
                element={<ResetPasswordRequest />}
              />
              <Route path='/reset-password' element={<ResetPassword />} />
              <Route path='/verify-email' element={<VerifyEmail />} />
              <Route path='/guide' element={<UserGuide />} />
              <Route element={<PrivateRoute />}>
                <Route path='/chat' element={<App />} />
                <Route path='/projects' element={<App />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </TooltipProvider>
    </UserProvider>
  </ErrorBoundary>,
);

if (import.meta.env.DEV) {
  import('./utils/reportWebVitals').then(({ default: reportWebVitals }) => {
    reportWebVitals(console.log);
  });
}
