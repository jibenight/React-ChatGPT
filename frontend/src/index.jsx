import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Login from './features/auth/Login';
import Home from './features/chat/Home';
import ResetPasswordRequest from './features/auth/ResetPasswordRequest';
import ResetPassword from './features/auth/ResetPassword';
import Register from './features/auth/Register';
import Projects from './features/projects/Projects';
import './css/index.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { UserProvider } from './UserContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
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
        <Route path='/chat' element={<PrivateRoute />}>
          <Route index element={<App />} />
        </Route>
        <Route path='/projects' element={<PrivateRoute />}>
          <Route index element={<Projects />} />
        </Route>
      </Routes>
      </Router>
    </UserProvider>
  </React.StrictMode>,
);
