/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Récupérer les infos utilisateur
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Données utilisateur }
 * /api/update-user-data:
 *   post:
 *     tags: [Users]
 *     summary: Mettre à jour le profil
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *     responses:
 *       200: { description: Profil mis à jour }
 * /api/update-api-key:
 *   post:
 *     tags: [Users]
 *     summary: Sauvegarder une clé API provider
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, apiKey]
 *             properties:
 *               provider: { type: string, enum: [openai, gemini, claude, mistral, groq] }
 *               apiKey: { type: string }
 *     responses:
 *       200: { description: Clé sauvegardée }
 * /api/api-keys:
 *   get:
 *     tags: [Users]
 *     summary: Lister les clés API configurées
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Liste des providers configurés }
 * /api/api-keys/{provider}:
 *   delete:
 *     tags: [Users]
 *     summary: Supprimer une clé API
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Clé supprimée }
 */
const express = require('express');
const userApi = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const userController = require('../controllers/userController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateBody, validateParams } = require('../middlewares/validate');
const { createDatabaseStore } = require('../rateLimitStore');

const updateApiKeySchema = z.object({
  provider: z.enum(['openai', 'gemini', 'claude', 'mistral', 'groq']),
  apiKey: z.string().min(1).max(500),
});

const updateUserDataSchema = z.object({
  username: z.string().min(1).max(100),
});

const providerParam = z.object({
  provider: z.enum(['openai', 'gemini', 'claude', 'mistral', 'groq']),
});

const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createDatabaseStore(),
});

// gestion des fonctions asynchrones dans les routes Express
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

userApi.get('/api/users', isAuthenticated, userLimiter, asyncHandler(userController.getUsers));
userApi.post('/api/update-api-key', isAuthenticated, userLimiter, validateBody(updateApiKeySchema), asyncHandler(userController.updateApiKey));
userApi.post('/api/update-user-data', isAuthenticated, userLimiter, validateBody(updateUserDataSchema), asyncHandler(userController.updateUserData));
userApi.get('/api/api-keys', isAuthenticated, userLimiter, asyncHandler(userController.getApiKeys));
userApi.delete('/api/api-keys/:provider', isAuthenticated, userLimiter, validateParams(providerParam), asyncHandler(userController.deleteApiKey));
userApi.delete('/api/users/me', isAuthenticated, userLimiter, asyncHandler(userController.deleteAccount));

module.exports = userApi;
