const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../models/database');
require('dotenv').config();

const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  throw new Error('SECRET_KEY environment variable is required.');
}
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

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const maxAgeDays = Number(process.env.AUTH_COOKIE_MAX_AGE_DAYS);
const AUTH_COOKIE_MAX_AGE_MS =
  Number.isFinite(maxAgeDays) && maxAgeDays > 0
    ? maxAgeDays * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;
const AUTH_COOKIE_SECURE = parseBoolean(process.env.AUTH_COOKIE_SECURE, isProduction);
const AUTH_COOKIE_SAME_SITE = parseSameSite(process.env.AUTH_COOKIE_SAMESITE);
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN
  ? process.env.AUTH_COOKIE_DOMAIN.trim()
  : '';

if (AUTH_COOKIE_SAME_SITE === 'none' && !AUTH_COOKIE_SECURE) {
  throw new Error(
    'AUTH_COOKIE_SAMESITE=none requires AUTH_COOKIE_SECURE=true for browser compatibility.',
  );
}

const rawAppUrl = process.env.APP_URL;
if (!rawAppUrl) {
  throw new Error('APP_URL environment variable is required.');
}

let normalizedAppUrl = rawAppUrl.trim().replace(/\/+$/, '');
try {
  normalizedAppUrl = new URL(normalizedAppUrl).toString().replace(/\/+$/, '');
} catch {
  throw new Error('APP_URL must be a valid absolute URL.');
}

// Création du transporter Nodemailer
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpSecure =
  process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : smtpPort === 465;
const smtpPassword = process.env.SMTP_PASSWORD || process.env.PASSWORD;
if (!smtpPassword) {
  throw new Error('SMTP_PASSWORD (or PASSWORD) environment variable is required.');
}
if (!process.env.EMAIL_USER) {
  throw new Error('EMAIL_USER environment variable is required.');
}
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
    pass: smtpPassword,
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

const getAppUrl = () => normalizedAppUrl;
const authCookieOptions = includeMaxAge => ({
  httpOnly: true,
  secure: AUTH_COOKIE_SECURE,
  sameSite: AUTH_COOKIE_SAME_SITE,
  path: '/',
  ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
  ...(includeMaxAge ? { maxAge: AUTH_COOKIE_MAX_AGE_MS } : {}),
});

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions(true));
};

const clearAuthCookie = res => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions(false));
};

const sendVerificationEmail = (req, email, token) => {
  const appUrl = getAppUrl();
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

const emailFingerprint = email => {
  if (!email) return 'unknown';
  try {
    return crypto.createHash('sha256').update(email).digest('hex').slice(0, 12);
  } catch {
    return 'unknown';
  }
};

const toDbDateTime = (date: Date) =>
  date.toISOString().slice(0, 19).replace('T', ' ');
const futureDbDateTime = (hours: number) =>
  toDbDateTime(new Date(Date.now() + hours * 60 * 60 * 1000));

const logAuthEvent = (event, payload: Record<string, any> = {}) => {
  const safePayload = {
    ...payload,
    email: undefined,
    emailFingerprint: payload.email ? emailFingerprint(payload.email) : undefined,
  };
  console.warn(`[auth] ${event}`, safePayload);
};

const cleanupExpiredTokens = () => {
  db.run(
    'DELETE FROM password_resets WHERE expires_at <= CURRENT_TIMESTAMP',
    cleanupErr => {
      if (cleanupErr) console.error(cleanupErr.message);
    },
  );
  db.run(
    'DELETE FROM email_verifications WHERE expires_at <= CURRENT_TIMESTAMP',
    cleanupErr => {
      if (cleanupErr) console.error(cleanupErr.message);
    },
  );
};

exports.register = async (req, res) => {
  const checkUserCountQuery = 'SELECT COUNT(*) as user_count FROM users';

  db.get(checkUserCountQuery, async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    // if (row.user_count >= 10) {
    //   return res.status(400).json({ error: 'Only one user allowed' });
    // }

    const { username, password } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    // Vérification si l'email existe déjà
    const emailExists = await new Promise<any>((resolve, reject) => {
      db.get('SELECT email FROM users WHERE email = ?', email, (err, row) => {
        if (err) {
          reject(err);
        }
        resolve(row);
      });
    });
    if (emailExists) {
      console.log('email issue');
      logAuthEvent('register_email_exists', { email });
      return res.status(400).json({ error: 'exists' });
    }
    // Vérification du mot de passe
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
      console.log('password issue');
      logAuthEvent('register_password_invalid', { email });
      return res.status(400).json({
        error: 'characters',
      });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    cleanupExpiredTokens();
    db.run(
      'INSERT INTO users (username, email, password, email_verified) VALUES (?,?,?,?)',
      [username, email, hashedPassword, 0],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Internal server error' });
        }
        const resetToken = uuidv4();
        db.run(
          'DELETE FROM email_verifications WHERE email = ?',
          [email],
          deleteErr => {
            if (deleteErr) {
              return res.status(500).json({ error: 'Internal server error' });
            }
            db.run(
              'INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)',
              [email, resetToken, futureDbDateTime(24)],
              async insertErr => {
                if (insertErr) {
                  return res.status(500).json({ error: 'Internal server error' });
                }
                try {
                  await sendVerificationEmail(req, email, resetToken);
                  logAuthEvent('register_verification_sent', { email });
                  res.status(201).json({
                    message: 'User registered successfully',
                    userId: this.lastID,
                    emailVerificationRequired: true,
                  });
                } catch (mailErr) {
                  logAuthEvent('register_verification_failed', {
                    email,
                    reason: mailErr.message,
                  });
                  res.status(500).json({ error: 'Internal server error' });
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
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!row) {
      logAuthEvent('login_email_not_found', { email });
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const match = await bcrypt.compare(password, row.password);
    if (match) {
      if (!row.email_verified) {
        logAuthEvent('login_email_not_verified', { email });
        return res.status(403).json({ error: 'email_not_verified' });
      }
      const token = jwt.sign({ id: row.id }, secretKey, { expiresIn: '7d' });
      setAuthCookie(res, token);
      res.status(200).json({
        message: 'Login successful',
        userId: row.id,
        username: row.username,
        email: row.email,
        email_verified: row.email_verified,
      });
    } else {
      logAuthEvent('login_password_invalid', { email });
      res.status(401).json({ error: 'invalid_credentials' });
    }
  });
};

exports.resetPasswordRequest = (req, res) => {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
  cleanupExpiredTokens();
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!row) {
      logAuthEvent('reset_request_no_account', { email });
      return res.status(200).json({ message: 'Reset email sent' });
    }

    const resetToken = uuidv4();
    db.run(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, resetToken, futureDbDateTime(1)],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Internal server error' });
        }

        const appUrl = getAppUrl();
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
            logAuthEvent('reset_email_failed', {
              email,
              reason: err.message,
            });
            return res.status(500).json({ error: 'Internal server error' });
          }
          if (process.env.SMTP_DEBUG === 'true') {
            console.log('SMTP messageId:', info.messageId);
            console.log('SMTP accepted:', info.accepted);
            console.log('SMTP rejected:', info.rejected);
            if (info.response) {
              console.log('SMTP response:', info.response);
            }
          }
          logAuthEvent('reset_email_sent', { email });
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
    'SELECT * FROM password_resets WHERE token = ? AND expires_at > CURRENT_TIMESTAMP',
    [token],
    async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!row) {
        logAuthEvent('verify_token_invalid', { tokenPresent: true });
        return res.status(404).json({ error: 'Invalid or expired token' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      db.run(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, row.email],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Internal server error' });
          }
          db.run(
            'DELETE FROM password_resets WHERE token = ?',
            [token],
            function (err) {
              if (err) {
                return res.status(500).json({ error: 'Internal server error' });
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
  cleanupExpiredTokens();
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!row) {
      logAuthEvent('verify_resend_no_account', { email });
      return res.status(200).json({ message: 'Verification email sent' });
    }
    if (row.email_verified) {
      logAuthEvent('verify_resend_already_verified', { email });
      return res.status(200).json({ message: 'Verification email sent' });
    }

    const verifyToken = uuidv4();
    db.run(
      'DELETE FROM email_verifications WHERE email = ?',
      [email],
      deleteErr => {
        if (deleteErr) {
          return res.status(500).json({ error: 'Internal server error' });
        }
        db.run(
          'INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)',
          [email, verifyToken, futureDbDateTime(24)],
          async insertErr => {
            if (insertErr) {
              return res.status(500).json({ error: 'Internal server error' });
            }
            try {
              await sendVerificationEmail(req, email, verifyToken);
              logAuthEvent('verify_resend_sent', { email });
              res.status(200).json({ message: 'Verification email sent' });
            } catch (mailErr) {
              logAuthEvent('verify_resend_failed', {
                email,
                reason: mailErr.message,
              });
              res.status(500).json({ error: 'Internal server error' });
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
  cleanupExpiredTokens();
  db.get(
    'SELECT * FROM email_verifications WHERE token = ? AND expires_at > CURRENT_TIMESTAMP',
    [token],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Invalid or expired token' });
      }
      db.run(
        'UPDATE users SET email_verified = 1 WHERE email = ?',
        [row.email],
        updateErr => {
          if (updateErr) {
            return res.status(500).json({ error: 'Internal server error' });
          }
          db.run(
            'DELETE FROM email_verifications WHERE token = ?',
            [token],
            deleteErr => {
              if (deleteErr) {
                return res.status(500).json({ error: 'Internal server error' });
              }
              db.get(
                'SELECT id, username, email FROM users WHERE email = ?',
                [row.email],
                (userErr, userRow) => {
                  if (userErr) {
                    return res.status(500).json({ error: 'Internal server error' });
                  }
              if (!userRow) {
                logAuthEvent('verify_user_missing', { email: row.email });
                return res.status(404).json({ error: 'User not found' });
              }
              const authToken = jwt.sign({ id: userRow.id }, secretKey, {
                expiresIn: '7d',
              });
              setAuthCookie(res, authToken);
              logAuthEvent('verify_success', { email: userRow.email });
              res.status(200).json({
                message: 'Email verified successfully',
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

exports.logout = (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Logout successful' });
};

exports.cleanupExpiredTokens = cleanupExpiredTokens;
