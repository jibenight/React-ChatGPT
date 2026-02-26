/**
 * @openapi
 * /api/threads:
 *   get:
 *     tags: [Threads]
 *     summary: Lister les conversations
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Liste des threads }
 *   post:
 *     tags: [Threads]
 *     summary: Créer une conversation
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               title: { type: string }
 *               projectId: { type: integer }
 *     responses:
 *       201: { description: Thread créé }
 * /api/threads/{threadId}:
 *   patch:
 *     tags: [Threads]
 *     summary: Renommer une conversation
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Thread mis à jour }
 *   delete:
 *     tags: [Threads]
 *     summary: Supprimer une conversation
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Thread supprimé }
 * /api/threads/{threadId}/messages:
 *   get:
 *     tags: [Threads]
 *     summary: Récupérer les messages d'une conversation
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: beforeId
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Liste des messages }
 * /api/threads/{threadId}/export:
 *   get:
 *     tags: [Threads]
 *     summary: Exporter une conversation (MD ou JSON)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [md, json], default: md }
 *     responses:
 *       200: { description: Conversation exportée }
 */
const express = require('express');
const threads = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const threadController = require('../controllers/threadController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validate');
const { createDatabaseStore } = require('../rateLimitStore');
const { asyncHandler } = require('../middlewares/asyncHandler');

const createThreadSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(200).optional(),
  projectId: z.union([z.string(), z.number()]).optional(),
});

const updateThreadSchema = z.object({
  title: z.string().max(200).optional(),
  projectId: z.union([z.string(), z.number(), z.null()]).optional(),
});

const threadIdParam = z.object({
  threadId: z.string().min(1),
});

const threadMessagesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  beforeId: z.coerce.number().int().optional(),
});

const exportThreadQuery = z.object({
  format: z.enum(['md', 'json']),
});

const threadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: createDatabaseStore(),
});

threads.get('/api/threads', isAuthenticated, threadLimiter, asyncHandler(threadController.listThreads));
threads.post('/api/threads', isAuthenticated, threadLimiter, validateBody(createThreadSchema), asyncHandler(threadController.createThreadRoot));
threads.get(
  '/api/threads/:threadId/messages',
  isAuthenticated,
  threadLimiter,
  validateParams(threadIdParam),
  validateQuery(threadMessagesQuery),
  asyncHandler(threadController.getThreadMessages),
);
threads.get(
  '/api/threads/:threadId/export',
  isAuthenticated,
  threadLimiter,
  validateParams(threadIdParam),
  validateQuery(exportThreadQuery),
  asyncHandler(threadController.exportThread),
);
threads.delete(
  '/api/threads/:threadId',
  isAuthenticated,
  threadLimiter,
  validateParams(threadIdParam),
  asyncHandler(threadController.deleteThread),
);
threads.patch(
  '/api/threads/:threadId',
  isAuthenticated,
  threadLimiter,
  validateParams(threadIdParam),
  validateBody(updateThreadSchema),
  asyncHandler(threadController.updateThread),
);

module.exports = threads;
