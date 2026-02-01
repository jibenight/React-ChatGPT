import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Login from './features/auth/Login';
import Home from './features/chat/Home';
import ResetPasswordRequest from './features/auth/ResetPasswordRequest';
import ResetPassword from './features/auth/ResetPassword';
import Register from './features/auth/Register';
import VerifyEmail from './features/auth/VerifyEmail';
import UserGuide from './features/info/UserGuide';
import './css/App.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { UserProvider } from './UserContext';

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
  <UserProvider>
    <TooltipProvider>
      <Router>
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
      </Router>
    </TooltipProvider>
  </UserProvider>,
);
