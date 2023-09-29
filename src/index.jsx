import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './routes/App';
import Login from './routes/login';
import ResetPasswordRequest from './routes/resetPasswordRequest';
import Register from './routes/register';
import './css/index.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { UserProvider } from './UserContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <Router>
        <Routes>
          <Route path='/register' element={<Register />} />
          <Route path='/login' element={<Login />} />
          <Route
            path='/reset-password-request'
            element={<ResetPasswordRequest />}
          />
          <Route path='/' element={<PrivateRoute />}>
            <Route index element={<App />} />
          </Route>
        </Routes>
      </Router>
    </UserProvider>
  </React.StrictMode>
);
