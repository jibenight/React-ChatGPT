const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const isAuthenticated = require('../middlewares/isAuthenticated');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many chat requests. Try again soon.' });
  },
});

const attachmentSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    dataUrl: z.string().optional(),
    fileUri: z.string().optional(),
  })
  .passthrough();

const chatMessageSchema = z
  .object({
    sessionId: z.string().optional(),
    threadId: z.string().optional(),
    message: z.string().max(8000).optional(),
    provider: z.enum(['openai', 'gemini', 'claude', 'mistral', 'groq']).optional(),
    model: z.string().optional(),
    projectId: z.union([z.string(), z.number()]).nullable().optional(),
    attachments: z.array(attachmentSchema).optional(),
  })
  .refine(data => data.threadId || data.sessionId, {
    message: 'threadId or sessionId is required',
  })
  .refine(data => data.message || (data.attachments && data.attachments.length > 0), {
    message: 'message or attachments required',
  });

const validateChatMessage = (req, res, next) => {
  const result = chatMessageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error.errors });
  }
  req.body = result.data;
  return next();
};

router.post(
  '/message',
  chatLimiter,
  isAuthenticated,
  validateChatMessage,
  chatController.sendMessage,
);

module.exports = router;
