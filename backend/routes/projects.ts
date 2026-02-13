/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: Lister les projets
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Liste des projets }
 *   post:
 *     tags: [Projects]
 *     summary: Créer un projet
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               instructions: { type: string }
 *               context_data: { type: string }
 *     responses:
 *       201: { description: Projet créé }
 * /api/projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Détails d'un projet
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Projet }
 *   patch:
 *     tags: [Projects]
 *     summary: Modifier un projet
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Projet mis à jour }
 *   delete:
 *     tags: [Projects]
 *     summary: Supprimer un projet
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Projet supprimé }
 * /api/projects/{projectId}/members:
 *   get:
 *     tags: [Projects]
 *     summary: Lister les membres d'un projet
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Liste des membres }
 *   post:
 *     tags: [Projects]
 *     summary: Ajouter un membre au projet
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email: { type: string }
 *               role: { type: string, enum: [editor, viewer] }
 *     responses:
 *       201: { description: Membre ajouté }
 */
const express = require('express');
const projects = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const projectController = require('../controllers/projectController');
const threadController = require('../controllers/threadController');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validateBody, validateParams } = require('../middlewares/validate');
const { createDatabaseStore } = require('../rateLimitStore');

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(10000).optional(),
  context_data: z.string().max(50000).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(10000).optional(),
  context_data: z.string().max(50000).optional(),
});

const projectIdParam = z.object({
  projectId: z.coerce.number().int().positive(),
});

const memberParam = z.object({
  projectId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

const projectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: createDatabaseStore(),
});

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── Project CRUD ────────────────────────────────────────────────────
projects.get('/api/projects', isAuthenticated, projectLimiter, asyncHandler(projectController.listProjects));
projects.post('/api/projects', isAuthenticated, projectLimiter, validateBody(createProjectSchema), asyncHandler(projectController.createProject));
projects.get('/api/projects/:projectId', isAuthenticated, projectLimiter, validateParams(projectIdParam), asyncHandler(projectController.getProject));
projects.patch('/api/projects/:projectId', isAuthenticated, projectLimiter, validateParams(projectIdParam), validateBody(updateProjectSchema), asyncHandler(projectController.updateProject));
projects.delete('/api/projects/:projectId', isAuthenticated, projectLimiter, validateParams(projectIdParam), asyncHandler(projectController.deleteProject));

// ── Project members ─────────────────────────────────────────────────
projects.get(
  '/api/projects/:projectId/members',
  isAuthenticated,
  projectLimiter,
  validateParams(projectIdParam),
  asyncHandler(projectController.getMembers),
);
projects.post(
  '/api/projects/:projectId/members',
  isAuthenticated,
  projectLimiter,
  validateParams(projectIdParam),
  validateBody(addMemberSchema),
  asyncHandler(projectController.addMember),
);
projects.patch(
  '/api/projects/:projectId/members/:userId',
  isAuthenticated,
  projectLimiter,
  validateParams(memberParam),
  validateBody(updateMemberRoleSchema),
  asyncHandler(projectController.updateMemberRole),
);
projects.delete(
  '/api/projects/:projectId/members/:userId',
  isAuthenticated,
  projectLimiter,
  validateParams(memberParam),
  asyncHandler(projectController.removeMember),
);

// ── Project threads ─────────────────────────────────────────────────
projects.get(
  '/api/projects/:projectId/threads',
  isAuthenticated,
  projectLimiter,
  validateParams(projectIdParam),
  asyncHandler(threadController.listProjectThreads),
);
projects.post(
  '/api/projects/:projectId/threads',
  isAuthenticated,
  projectLimiter,
  validateParams(projectIdParam),
  asyncHandler(threadController.createThread),
);

module.exports = projects;
