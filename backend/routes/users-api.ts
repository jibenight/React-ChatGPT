const express = require('express');
const userApi = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const userController = require('../controllers/userController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateBody, validateParams } = require('../middlewares/validate');

const updateApiKeySchema = z.object({
  provider: z.enum(['openai', 'gemini', 'claude', 'mistral']),
  apiKey: z.string().min(1).max(500),
});

const updateUserDataSchema = z.object({
  username: z.string().min(1).max(100),
});

const providerParam = z.object({
  provider: z.enum(['openai', 'gemini', 'claude', 'mistral']),
});

const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
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

module.exports = userApi;
