const bcrypt = require('bcrypt');
const saltRounds = 10;
const express = require('express');
const auth = express.Router();
const db = require('../models/database');
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';

// Requête SQL pour vérifier le nombre d'utilisateurs
const checkUserCountQuery = 'SELECT COUNT(*) as user_count FROM users';

// pour l'inscription
auth.post('/register', async (req, res) => {
  db.get(checkUserCountQuery, async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row.user_count >= 10) {
      return res.status(400).json({ error: 'Only one user allowed' });
    }

    const { username, email, password } = req.body;
    // Vérification si l'email existe déjà
    const emailExists = await new Promise((resolve, reject) => {
      db.get('SELECT email FROM users WHERE email = ?', email, (err, row) => {
        if (err) {
          reject(err);
        }
        resolve(row);
      });
    });
    if (emailExists) {
      return res.status(400).json({ error: 'exists' });
    }
    // Vérification du mot de passe
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/.test(password)) {
      return res.status(400).json({
        error: 'characters',
      });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?,?,?)',
      [username, email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: 'User registered successfully',
          userId: this.lastID,
        });
      }
    );
  });
});

// connexion d'un utilisateur
// auth.post('/login', (req, res) => {
//   const { email, password } = req.body;

//   db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
//     if (err) {
//       return res.status(500).json({ error: err.message });
//     }
//     if (!row) {
//       return res.status(404).json({ error: 'email not found' });
//     }

//     const match = await bcrypt.compare(password, row.password);
//     if (match) {
//       res.status(200).json({ message: 'Login successful', userId: row.id });
//     } else {
//       res.status(401).json({ error: 'Incorrect password' });
//     }
//   });
// });

auth.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'email not found' });
    }

    const match = await bcrypt.compare(password, row.password);
    if (match) {
      const token = jwt.sign({ id: row.id }, secretKey, { expiresIn: '1h' });
      res
        .status(200)
        .json({ message: 'Login successful', userId: row.id, token });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  });
});

module.exports = auth;
