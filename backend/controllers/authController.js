const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const db = require('../models/database');
require('dotenv').config();

const secretKey = process.env.SECRET_KEY;

// Création du transporter Nodemailer
const transporter = nodemailer.createTransport({
  host: 'mail.jean-nguyen.dev',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.PASSWORD,
  },
});

exports.register = async (req, res) => {
  console.log(req.body);
  const checkUserCountQuery = 'SELECT COUNT(*) as user_count FROM users';

  db.get(checkUserCountQuery, async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // if (row.user_count >= 10) {
    //   return res.status(400).json({ error: 'Only one user allowed' });
    // }

    const { username, password } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
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
      console.log('email issue');
      return res.status(400).json({ error: 'exists' });
    }
    // Vérification du mot de passe
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
      console.log('password issue');
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
      },
    );
  });
};

exports.login = (req, res) => {
  const { password } = req.body;
  const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

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
};

exports.resetPasswordRequest = (req, res) => {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
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

        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
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
      },
    );
  });
};

exports.resetPassword = (req, res) => {
  const { token, newPassword } = req.body;

  // Vérification de la complexité du mot de passe
  if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(newPassword)) {
    return res.status(400).json({
      error:
        'Password must contain at least 8 characters, one uppercase, one lowercase and one number.',
    });
  }

  db.get(
    'SELECT * FROM password_resets WHERE token = ? AND expires_at > DATETIME("now")',
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
            },
          );
        },
      );
    },
  );
};
