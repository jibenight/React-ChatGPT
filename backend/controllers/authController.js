const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const db = require('../models/database');
require('dotenv').config();

const secretKey = process.env.SECRET_KEY;

// Création du transporter Nodemailer
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpSecure =
  process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : smtpPort === 465;
const dkimPrivateKey = process.env.DKIM_PRIVATE_KEY;
const dkimDomain = process.env.DKIM_DOMAIN;
const dkimSelector = process.env.DKIM_SELECTOR || 'default';

if (dkimPrivateKey && !dkimDomain) {
  console.warn('DKIM_DOMAIN is missing while DKIM_PRIVATE_KEY is set.');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.jean-nguyen.dev',
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.PASSWORD,
  },
  ...(dkimPrivateKey && dkimDomain
    ? {
        dkim: {
          domainName: dkimDomain,
          keySelector: dkimSelector,
          privateKey: dkimPrivateKey.replace(/\\n/g, '\n'),
        },
      }
    : {}),
});

if (process.env.SMTP_DEBUG === 'true') {
  transporter.verify(err => {
    if (err) {
      console.error('SMTP verify failed:', err.message);
    } else {
      console.log('SMTP server is ready to take messages');
    }
  });
}

const getAppUrl = req =>
  process.env.APP_URL || req.get('origin') || 'http://localhost:5173';

const sendVerificationEmail = (req, email, token) => {
  const appUrl = getAppUrl(req);
  const verifyLink = `${appUrl}/verify-email?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    replyTo: process.env.REPLY_TO || process.env.EMAIL_USER,
    to: email,
    subject: 'Vérifiez votre adresse e-mail',
    text: `Cliquez ici pour vérifier votre adresse e-mail : ${verifyLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">Vérifiez votre adresse e-mail</h2>
        <p style="margin: 0 0 12px;">Merci pour votre inscription. Veuillez vérifier votre adresse e-mail pour activer votre compte.</p>
        <p style="margin: 16px 0;">
          <a href="${verifyLink}" style="display: inline-block; padding: 12px 18px; background: #14b8a6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Vérifier mon e-mail
          </a>
        </p>
        <p style="margin: 0 0 12px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
        <p style="margin: 0; word-break: break-all; color: #0f766e;">
          ${verifyLink}
        </p>
        <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
          Ce lien expire dans 24 heures. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.
        </p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};

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
      'INSERT INTO users (username, email, password, email_verified) VALUES (?,?,?,?)',
      [username, email, hashedPassword, 0],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        const resetToken = uuidv4();
        db.run(
          'DELETE FROM email_verifications WHERE email = ?',
          [email],
          deleteErr => {
            if (deleteErr) {
              return res.status(500).json({ error: deleteErr.message });
            }
            db.run(
              'INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, DATETIME("now", "+24 hour"))',
              [email, resetToken],
              async insertErr => {
                if (insertErr) {
                  return res.status(500).json({ error: insertErr.message });
                }
                try {
                  await sendVerificationEmail(req, email, resetToken);
                  res.status(201).json({
                    message: 'User registered successfully',
                    userId: this.lastID,
                    emailVerificationRequired: true,
                  });
                } catch (mailErr) {
                  res.status(500).json({ error: mailErr.message });
                }
              },
            );
          },
        );
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
      if (!row.email_verified) {
        return res.status(403).json({ error: 'email_not_verified' });
      }
      const token = jwt.sign({ id: row.id }, secretKey, { expiresIn: '7d' });
      res.status(200).json({
        message: 'Login successful',
        userId: row.id,
        token,
        username: row.username,
        email: row.email,
        email_verified: row.email_verified,
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

        const appUrl = getAppUrl(req);
        const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          replyTo: process.env.REPLY_TO || process.env.EMAIL_USER,
          to: email,
          subject: 'Réinitialisation du mot de passe',
          text: `Cliquez ici pour réinitialiser votre mot de passe : ${resetLink}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
              <h2 style="margin: 0 0 12px;">Réinitialisation du mot de passe</h2>
              <p style="margin: 0 0 12px;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer :</p>
              <p style="margin: 16px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 12px 18px; background: #14b8a6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Réinitialiser le mot de passe
                </a>
              </p>
              <p style="margin: 0 0 12px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
              <p style="margin: 0; word-break: break-all; color: #0f766e;">
                ${resetLink}
              </p>
              <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
                Ce lien expire dans 1 heure. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.
              </p>
            </div>
          `,
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (process.env.SMTP_DEBUG === 'true') {
            console.log('SMTP messageId:', info.messageId);
            console.log('SMTP accepted:', info.accepted);
            console.log('SMTP rejected:', info.rejected);
            if (info.response) {
              console.log('SMTP response:', info.response);
            }
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

exports.resendVerification = (req, res) => {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'email not found' });
    }
    if (row.email_verified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    const verifyToken = uuidv4();
    db.run(
      'DELETE FROM email_verifications WHERE email = ?',
      [email],
      deleteErr => {
        if (deleteErr) {
          return res.status(500).json({ error: deleteErr.message });
        }
        db.run(
          'INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, DATETIME("now", "+24 hour"))',
          [email, verifyToken],
          async insertErr => {
            if (insertErr) {
              return res.status(500).json({ error: insertErr.message });
            }
            try {
              await sendVerificationEmail(req, email, verifyToken);
              res.status(200).json({ message: 'Verification email sent' });
            } catch (mailErr) {
              res.status(500).json({ error: mailErr.message });
            }
          },
        );
      },
    );
  });
};

exports.verifyEmail = (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  db.get(
    'SELECT * FROM email_verifications WHERE token = ? AND expires_at > DATETIME("now")',
    [token],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Invalid or expired token' });
      }
      db.run(
        'UPDATE users SET email_verified = 1 WHERE email = ?',
        [row.email],
        updateErr => {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }
          db.run(
            'DELETE FROM email_verifications WHERE token = ?',
            [token],
            deleteErr => {
              if (deleteErr) {
                return res.status(500).json({ error: deleteErr.message });
              }
              db.get(
                'SELECT id, username, email FROM users WHERE email = ?',
                [row.email],
                (userErr, userRow) => {
                  if (userErr) {
                    return res.status(500).json({ error: userErr.message });
                  }
                  if (!userRow) {
                    return res.status(404).json({ error: 'User not found' });
                  }
                  const authToken = jwt.sign({ id: userRow.id }, secretKey, {
                    expiresIn: '7d',
                  });
                  res.status(200).json({
                    message: 'Email verified successfully',
                    token: authToken,
                    userId: userRow.id,
                    username: userRow.username,
                    email: userRow.email,
                  });
                },
              );
            },
          );
        },
      );
    },
  );
};
