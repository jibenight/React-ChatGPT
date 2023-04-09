const express = require('express');
const userApi = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');

// gestion des fonctions asynchrones dans les routes Express
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// middleware
userApi.get(
  '/api/users',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const query = 'SELECT * FROM users WHERE id = ?;';

    try {
      const rows = await db.all(query, [req.user.id]);
      res.json(rows);
      console.log(rows);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
);

module.exports = userApi;
