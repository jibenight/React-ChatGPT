require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../models/database');
const secretKey = process.env.SECRET_KEY;

const DEV_BYPASS_AUTH =
  process.env.DEV_BYPASS_AUTH === 'true' &&
  process.env.NODE_ENV !== 'production';

const normalizeHeaderValue = value => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const ensureDevUser = async (email, username) => {
  const existing = await new Promise<any>((resolve, reject) => {
    db.get('SELECT id, email, username FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  if (existing) return existing;

  const randomPassword = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const result = await new Promise<any>((resolve, reject) => {
    db.run(
      'INSERT INTO users (username, email, password, email_verified) VALUES (?,?,?,?)',
      [username || 'Dev User', email, hashedPassword, 1],
      function(err) {
        if (err) reject(err);
        else resolve(this);
      },
    );
  });

  return { id: result.lastID, email, username: username || 'Dev User' };
};

const isAuthenticated = async (req, res, next) => {
  if (DEV_BYPASS_AUTH) {
    try {
      const headerEmail = normalizeHeaderValue(req.headers['x-dev-user-email']);
      const headerName = normalizeHeaderValue(req.headers['x-dev-user-name']);
      const email = headerEmail ? String(headerEmail).toLowerCase() : 'dev@local';
      const username = headerName ? String(headerName) : 'Dev User';
      const user = await ensureDevUser(email, username);
      req.user = { id: user.id, isDev: true };
      return next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.log('Invalid token', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: decoded.id };
    next();
  });
};

module.exports = isAuthenticated;
