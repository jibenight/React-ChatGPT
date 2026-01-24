const express = require('express');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const cryptoJS = require('crypto-js');
const db = require('../models/database');
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
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }),
);

userApi.post(
  '/api/update-api-key',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    console.log('Route /api/update-api-key accessed');
    const { apiKey } = req.body;
    const userId = req.user.id;
    const encryptionKey = process.env.ENCRYPTION_KEY; // Assume you have set this environment variable
    const encryptedApiKey = cryptoJS.AES.encrypt(
      apiKey,
      encryptionKey,
    ).toString();

    console.log(userId);
    const query = `
                    INSERT OR REPLACE INTO api_keys (id, user_id, api_key)
                    VALUES (
                      (SELECT id FROM api_keys WHERE user_id = ?),
                      ?,
                      ?
                    );
                  `;

    try {
      await db.run(query, [userId, userId, encryptedApiKey]);
      res.status(200).json({ message: 'API Key updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }),
);

userApi.post(
  '/api/update-user-data',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    console.log('Route /api/update-user-data accessed');
    const userId = req.user.id;
    const { username, password } = req.body;

    let usernameExists = false;
    let hashedPassword = null;

    // Si un nouveau username est fourni, vérifiez s'il est unique
    if (username) {
      usernameExists = await new Promise((resolve, reject) => {
        db.get(
          'SELECT username FROM users WHERE username = ? AND id != ?',
          [username, userId],
          (err, row) => {
            if (err) {
              reject(err);
            }
            resolve(row);
          },
        );
      });
      if (usernameExists) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // Si un nouveau password est fourni, validez-le et hachez-le
    if (password) {
      if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
        return res.status(400).json({
          error:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number, and be at least 8 characters long',
        });
      }
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // Construisez la requête SQL en fonction des données fournies
    let query = 'UPDATE users SET ';
    const params = [];
    if (username) {
      query += 'username = ?, ';
      params.push(username);
    }
    if (hashedPassword) {
      query += 'password = ?, ';
      params.push(hashedPassword);
    }
    query = query.slice(0, -2); // Enlevez la dernière virgule et l'espace
    query += ' WHERE id = ?;';
    params.push(userId);

    try {
      await db.run(query, params);
      console.log(`User data updated successfully for user ID: ${userId}`);
      res.status(200).json({ message: 'User data updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }),
);

module.exports = userApi;
