const bcrypt = require('bcrypt');
const saltRounds = 10;
const express = require('express');
const auth = express.Router();
const db = require('../models/database');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const secretKey = process.env.SECRET_KEY;

// Création du transporter Nodemailer
const transporter = nodemailer.createTransport({
  host: 'mail.jean-nguyen.dev',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ACCOUNT_USER,
    pass: process.env.PASSWORD,
  },
});

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

// pour la connexion
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
      const token = jwt.sign({ id: row.id }, secretKey, { expiresIn: '7d' });
      console.log('Generated token:', token);
      res;

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

// Route pour la demande de réinitialisation
auth.post('/reset-password-request', (req, res) => {
  const { email } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'email not found' });
    }

    const resetToken = uuidv4();
    db.run(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, DATETIME("now", "+1 hour"))',
      [email, resetToken],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset Request',
          text: `Click here to reset your password: ${resetLink}`,
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(200).json({ message: 'Reset email sent' });
        });
      }
    );
  });
});

// Route pour la réinitialisation
auth.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  db.get(
    'SELECT * FROM password_resets WHERE token = ?',
    [token],
    async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Invalid or expired token' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      db.run(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, row.email],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          db.run(
            'DELETE FROM password_resets WHERE token = ?',
            [token],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.status(200).json({ message: 'Password reset successfully' });
            }
          );
        }
      );
    }
  );
});

module.exports = auth;
