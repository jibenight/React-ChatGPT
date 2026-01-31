const express = require('express');
const auth = express.Router();
const authController = require('../controllers/authController');

// pour l'inscription
auth.post('/register', authController.register);

// pour la connexion
auth.post('/login', authController.login);

// Route pour la demande de réinitialisation
auth.post('/reset-password-request', authController.resetPasswordRequest);

// Route pour la réinitialisation
auth.post('/reset-password', authController.resetPassword);

// Route pour la vérification email
auth.get('/verify-email', authController.verifyEmail);

// Route pour renvoyer l'email de vérification
auth.post('/verify-email-request', authController.resendVerification);

module.exports = auth;
