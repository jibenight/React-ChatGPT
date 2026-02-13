const express = require('express');
const search = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const searchController = require('../controllers/searchController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateQuery } = require('../middlewares/validate');
const { createDatabaseStore } = require('../rateLimitStore');

const searchQuerySchema = z.object({
  q: z.string().min(2),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createDatabaseStore(),
});

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

search.get(
  '/api/search',
  isAuthenticated,
  searchLimiter,
  validateQuery(searchQuerySchema),
  asyncHandler(searchController.search),
);

module.exports = search;
