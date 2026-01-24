const express = require('express');
const userApi = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const userController = require('../controllers/userController');

// gestion des fonctions asynchrones dans les routes Express
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

userApi.get('/api/users', isAuthenticated, asyncHandler(userController.getUsers));
userApi.post('/api/update-api-key', isAuthenticated, asyncHandler(userController.updateApiKey));
userApi.post('/api/update-user-data', isAuthenticated, asyncHandler(userController.updateUserData));

module.exports = userApi;
