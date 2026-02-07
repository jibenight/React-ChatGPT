const express = require('express');
const auth = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// pour l'inscription
auth.post('/register', registerLimiter, authController.register);

// pour la connexion
auth.post('/login', loginLimiter, authController.login);

// pour la déconnexion
auth.post('/logout', authController.logout);

// Route pour la demande de réinitialisation
auth.post('/reset-password-request', passwordLimiter, authController.resetPasswordRequest);

// Route pour la réinitialisation
auth.post('/reset-password', passwordLimiter, authController.resetPassword);

// Route pour la vérification email
auth.get('/verify-email', verifyLimiter, authController.verifyEmail);

// Route pour renvoyer l'email de vérification
auth.post('/verify-email-request', verifyLimiter, authController.resendVerification);

module.exports = auth;
