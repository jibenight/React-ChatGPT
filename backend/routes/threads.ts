const express = require('express');
const threads = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const threadController = require('../controllers/threadController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validate');

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

const threadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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
