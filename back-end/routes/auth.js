const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const saltRounds = 10;
const secretKey = process.env.SECRET_KEY || 'default_secret';

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
  }

  // Check email
  const emailExists = await new Promise((resolve) => {
    db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
      resolve(!!row);
    });
  });

  if (emailExists) {
    return res.status(400).json({ error: 'exists' });
  }

  // Validate password
  if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
      return res.status(400).json({ error: 'characters' });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  db.run(
    'INSERT INTO users (username, email, password) VALUES (?,?,?)',
    [username, email, hashedPassword],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
    }
  );
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'email not found' });

    const match = await bcrypt.compare(password, row.password);
    if (match) {
      const token = jwt.sign({ id: row.id }, secretKey, { expiresIn: '7d' });
      res.status(200).json({
        message: 'Login successful',
        userId: row.id,
        token,
        username: row.username,
        email: row.email,
      });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  });
});

module.exports = router;
