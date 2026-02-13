/**
 * @openapi
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Recherche full-text dans les messages
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Résultats de recherche }
 */
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
