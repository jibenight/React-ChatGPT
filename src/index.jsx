import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './routes/App';
import Login from './routes/login';
import Home from './routes/Home';
import ResetPasswordRequest from './routes/resetPasswordRequest';
import ResetPassword from './routes/resetPassword';
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
        </Routes>
      </Router>
    </UserProvider>
  </React.StrictMode>,
);
