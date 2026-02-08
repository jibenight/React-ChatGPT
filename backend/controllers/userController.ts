const bcrypt = require('bcrypt');
const cryptoJS = require('crypto-js');
const db = require('../models/database');
require('dotenv').config();

const saltRounds = 10;
const allowedProviders = ['openai', 'gemini', 'claude', 'mistral', 'groq'];

exports.getUsers = async (req, res) => {
  const query = 'SELECT * FROM users WHERE id = ?;';
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
        db.all(query, [req.user.id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateApiKey = async (req, res) => {
  console.log('Controller updateApiKey accessed');
  const { apiKey, provider } = req.body;
  const userId = req.user.id;
  const targetProvider = provider || 'openai';
  if (!allowedProviders.includes(targetProvider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'API key is required' });
  }
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  const encryptedApiKey = cryptoJS.AES.encrypt(apiKey, encryptionKey).toString();

  const query = `
    INSERT INTO api_keys (user_id, provider, api_key)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, provider)
    DO UPDATE SET api_key = excluded.api_key;
  `;

  try {
    await new Promise<void>((resolve, reject) => {
      db.run(
        query,
        [userId, targetProvider, encryptedApiKey],
        function(err) {
        if (err) reject(err);
        else resolve(this);
        },
      );
    });
    res.status(200).json({ message: 'API Key updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getApiKeys = async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        'SELECT provider FROM api_keys WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    const providers = rows.map(row => row.provider);
    res.status(200).json({ providers });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteApiKey = async (req, res) => {
  const userId = req.user.id;
  const { provider } = req.params;
  const targetProvider = provider || 'openai';
  if (!allowedProviders.includes(targetProvider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM api_keys WHERE user_id = ? AND provider = ?',
        [userId, targetProvider],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        },
      );
    });
    res.status(200).json({ message: 'API key deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateUserData = async (req, res) => {
  console.log('Controller updateUserData accessed');
  const userId = req.user.id;
  const { username, password } = req.body;

  let hashedPassword = null;

  try {
    if (username) {
        const usernameExists = await new Promise<any>((resolve, reject) => {
            db.get('SELECT username FROM users WHERE username = ? AND id != ?', [username, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        if (usernameExists) {
            return res.status(400).json({ error: 'Username already exists' });
        }
    }

    if (password) {
      if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number, and be at least 8 characters long',
        });
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

    // Check if there is anything to update
    if (params.length === 0) {
        return res.status(200).json({ message: 'No changes provided' });
    }

    query = query.slice(0, -2);
    query += ' WHERE id = ?;';
    params.push(userId);

    await new Promise<void>((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    console.log(`User data updated successfully for user ID: ${userId}`);
    res.status(200).json({ message: 'User data updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
