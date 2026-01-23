const express = require('express');
const router = express.Router();
const db = require('../models/database');
const isAuthenticated = require('../middlewares/isAuthenticated');
const cryptoJS = require('crypto-js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/api/update-api-key', isAuthenticated, asyncHandler(async (req, res) => {
    const { apiKey, provider } = req.body;
    const userId = req.user.id;
    const targetProvider = provider || 'openai';

    const encryptionKey = process.env.ENCRYPTION_KEY;
    const encryptedApiKey = cryptoJS.AES.encrypt(apiKey, encryptionKey).toString();

    const existingKey = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM api_keys WHERE user_id = ? AND provider = ?', [userId, targetProvider], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    if (existingKey) {
        await db.run('UPDATE api_keys SET api_key = ? WHERE id = ?', [encryptedApiKey, existingKey.id]);
    } else {
        await db.run('INSERT INTO api_keys (user_id, provider, api_key) VALUES (?, ?, ?)', [userId, targetProvider, encryptedApiKey]);
    }

    res.status(200).json({ message: 'API Key updated successfully' });
}));

router.post('/api/update-user-data', isAuthenticated, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { username, password } = req.body;

    let hashedPassword = null;

    if (username) {
        const userExists = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        if (userExists) return res.status(400).json({ error: 'Username already exists' });
    }

    if (password) {
        if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
            return res.status(400).json({ error: 'Password too weak' });
        }
        hashedPassword = await bcrypt.hash(password, saltRounds);
    }

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
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(userId);

    await db.run(query, params);
    res.status(200).json({ message: 'User data updated successfully' });
}));

module.exports = router;
