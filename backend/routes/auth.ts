const express = require('express');
const auth = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateBody, validateQuery } = require('../middlewares/validate');

const registerSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const verifyEmailQuerySchema = z.object({
  token: z.string().min(1),
});

const verifyEmailRequestSchema = z.object({
  email: z.string().email(),
});

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
auth.post('/register', registerLimiter, validateBody(registerSchema), authController.register);

// pour la connexion
auth.post('/login', loginLimiter, validateBody(loginSchema), authController.login);

// pour la déconnexion
auth.post('/logout', authController.logout);

// Route pour la demande de réinitialisation
auth.post('/reset-password-request', passwordLimiter, validateBody(resetPasswordRequestSchema), authController.resetPasswordRequest);

// Route pour la réinitialisation
auth.post('/reset-password', passwordLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

// Route pour la vérification email
auth.get('/verify-email', verifyLimiter, validateQuery(verifyEmailQuerySchema), authController.verifyEmail);

// Route pour renvoyer l'email de vérification
auth.post('/verify-email-request', verifyLimiter, validateBody(verifyEmailRequestSchema), authController.resendVerification);

module.exports = auth;
