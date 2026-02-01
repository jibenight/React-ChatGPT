const express = require('express');
const threads = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const threadController = require('../controllers/threadController');

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

threads.get('/api/threads', isAuthenticated, asyncHandler(threadController.listThreads));
threads.post('/api/threads', isAuthenticated, asyncHandler(threadController.createThreadRoot));
threads.get(
  '/api/threads/:threadId/messages',
  isAuthenticated,
  asyncHandler(threadController.getThreadMessages),
);
threads.delete(
  '/api/threads/:threadId',
  isAuthenticated,
  asyncHandler(threadController.deleteThread),
);
threads.patch(
  '/api/threads/:threadId',
  isAuthenticated,
  asyncHandler(threadController.updateThread),
);

module.exports = threads;
