const express = require('express');
const bcrypt = require('bcrypt');
const cryptoJS = require('crypto-js');
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

userApi.post(
  '/api/update-api-key',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { apiKey } = req.body;
    const userId = req.user.id;
    const encryptionKey = process.env.ENCRYPTION_KEY; // Assume you have set this environment variable
    const encryptedApiKey = cryptoJS.AES.encrypt(
      apiKey,
      encryptionKey
    ).toString();

    const query = `
      INSERT INTO api_keys (user_id, api_key)
      VALUES (?, ?)
      ON CONFLICT(user_id)
      DO UPDATE SET api_key = ?;
    `;
    try {
      await db.run(query, [userId, encryptedApiKey, encryptedApiKey]);
      res.status(200).json({ message: 'API Key updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

userApi.post(
  '/api/update-user-data',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { username, password } = req.body;

    // Vérification de l'unicité du username
    const usernameExists = await new Promise((resolve, reject) => {
      db.get(
        'SELECT username FROM users WHERE username = ? AND id != ?',
        [username, userId],
        (err, row) => {
          if (err) {
            reject(err);
          }
          resolve(row);
        }
      );
    });
    if (usernameExists) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Vérification du mot de passe
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
      return res.status(400).json({
        error:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number, and be at least 8 characters long',
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
      UPDATE users
      SET username = ?, password = ?
      WHERE id = ?;
    `;
    try {
      await db.run(query, [username, hashedPassword, userId]);
      res.status(200).json({ message: 'User data updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

module.exports = userApi;
