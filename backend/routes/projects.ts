const express = require('express');
const projects = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const projectController = require('../controllers/projectController');
const threadController = require('../controllers/threadController');

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

projects.get('/api/projects', isAuthenticated, asyncHandler(projectController.listProjects));
projects.post('/api/projects', isAuthenticated, asyncHandler(projectController.createProject));
projects.get('/api/projects/:projectId', isAuthenticated, asyncHandler(projectController.getProject));
projects.patch('/api/projects/:projectId', isAuthenticated, asyncHandler(projectController.updateProject));
projects.delete('/api/projects/:projectId', isAuthenticated, asyncHandler(projectController.deleteProject));

projects.get(
  '/api/projects/:projectId/threads',
  isAuthenticated,
  asyncHandler(threadController.listProjectThreads),
);
projects.post(
  '/api/projects/:projectId/threads',
  isAuthenticated,
  asyncHandler(threadController.createThread),
);

module.exports = projects;
