const bcrypt = require('bcrypt');
const cryptoJS = require('crypto-js');
const db = require('../models/database');
const { invalidateCache } = require('../apiKeyCache');
const logger = require('../logger');
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
  logger.info('Controller updateApiKey accessed');
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
    invalidateCache(userId, targetProvider);
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
    invalidateCache(userId, targetProvider);
    res.status(200).json({ message: 'API key deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateUserData = async (req, res) => {
  logger.info('Controller updateUserData accessed');
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

    logger.info({ userId }, 'User data updated successfully');
    res.status(200).json({ message: 'User data updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  logger.info('Controller deleteAccount accessed');
  const userId = req.user.id;

  try {
    // Get user email for cleanup
    const user = await new Promise<any>((resolve, reject) => {
      db.get('SELECT email FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.transaction(async txn => {
      // 1. Delete messages from user's threads
      await new Promise<void>((resolve, reject) => {
        txn.run(
          'DELETE FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE user_id = ?)',
          [userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      // 2. Delete user's threads
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM threads WHERE user_id = ?', [userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 3. Delete project memberships
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM project_members WHERE user_id = ?', [userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 4. Delete user's projects
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM projects WHERE user_id = ?', [userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 5. Delete API keys
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM api_keys WHERE user_id = ?', [userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 6. Delete password reset tokens (by email)
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM password_resets WHERE email = ?', [user.email], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 7. Delete email verification tokens (by email)
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM email_verifications WHERE email = ?', [user.email], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 8. Delete user account
      await new Promise<void>((resolve, reject) => {
        txn.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Clear auth cookie
    const clearAuthCookie = authRes => {
      const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
      const isProduction = process.env.NODE_ENV === 'production';
      const parseBoolean = (value, fallback) => {
        if (value === undefined || value === null || value === '') return fallback;
        const normalized = String(value).trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
        return fallback;
      };
      const parseSameSite = value => {
        const normalized = String(value || 'lax').trim().toLowerCase();
        if (normalized === 'strict') return 'strict';
        if (normalized === 'none') return 'none';
        return 'lax';
      };
      const AUTH_COOKIE_SECURE = parseBoolean(process.env.AUTH_COOKIE_SECURE, isProduction);
      const AUTH_COOKIE_SAME_SITE = parseSameSite(process.env.AUTH_COOKIE_SAMESITE);
      const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN
        ? process.env.AUTH_COOKIE_DOMAIN.trim()
        : '';
      const options = {
        httpOnly: true,
        secure: AUTH_COOKIE_SECURE,
        sameSite: AUTH_COOKIE_SAME_SITE,
        ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
      };
      authRes.clearCookie(AUTH_COOKIE_NAME, options);
    };
    clearAuthCookie(res);

    // Invalidate API key cache
    allowedProviders.forEach(provider => {
      invalidateCache(userId, provider);
    });

    logger.info({ userId }, 'User account deleted successfully');
    res.status(200).json({ message: 'Compte supprimé avec succès.' });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to delete user account');
    res.status(500).json({ error: 'Internal server error' });
  }
};
