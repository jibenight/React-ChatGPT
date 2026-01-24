const bcrypt = require('bcrypt');
const cryptoJS = require('crypto-js');
const db = require('../models/database');
require('dotenv').config();

const saltRounds = 10;

exports.getUsers = async (req, res) => {
  const query = 'SELECT * FROM users WHERE id = ?;';
  try {
    const rows = await new Promise((resolve, reject) => {
        db.all(query, [req.user.id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateApiKey = async (req, res) => {
  console.log('Controller updateApiKey accessed');
  const { apiKey } = req.body;
  const userId = req.user.id;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const encryptedApiKey = cryptoJS.AES.encrypt(apiKey, encryptionKey).toString();

  const query = `
    INSERT OR REPLACE INTO api_keys (id, user_id, api_key)
    VALUES (
      (SELECT id FROM api_keys WHERE user_id = ?),
      ?,
      ?
    );
  `;

  try {
    await new Promise((resolve, reject) => {
      db.run(query, [userId, userId, encryptedApiKey], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    res.status(200).json({ message: 'API Key updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserData = async (req, res) => {
  console.log('Controller updateUserData accessed');
  const userId = req.user.id;
  const { username, password } = req.body;

  let hashedPassword = null;

  try {
    if (username) {
        const usernameExists = await new Promise((resolve, reject) => {
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

    await new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

    console.log(`User data updated successfully for user ID: ${userId}`);
    res.status(200).json({ message: 'User data updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
