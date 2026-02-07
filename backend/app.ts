require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const db = require('./models/database');
const auth = require('./routes/auth');
const { cleanupExpiredTokens } = require('./controllers/authController');
const userApi = require('./routes/users-api');
const projectsApi = require('./routes/projects');
const threadsApi = require('./routes/threads');
const chatApiRoute = require('./routes/chatApi');

const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.APP_URL || '';
  return rawOrigins
    .split(',')
    .map(value => value.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();
if (allowedOrigins.length === 0) {
  throw new Error(
    'CORS_ALLOWED_ORIGINS or APP_URL must be set to at least one allowed origin.',
  );
}

const normalizeTrustProxy = value => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === '0') return false;
  if (normalized === 'true' || normalized === '1') return 1;
  const asNumber = Number(normalized);
  if (Number.isInteger(asNumber) && asNumber >= 0) return asNumber;
  return 1;
};

const securityHeaders = (req, res, next) => {
  const isHttps =
    req.secure || String(req.headers['x-forwarded-proto']).toLowerCase() === 'https';
  if (isHttps) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
  }
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Dev-User-Id',
    'X-Dev-User-Name',
    'X-Dev-User-Email',
  ],
  optionsSuccessStatus: 204,
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', normalizeTrustProxy(process.env.TRUST_PROXY));
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));
app.use(express.json({ limit: '15mb' }));
app.use(morgan('tiny'));

app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/', auth);
app.use('/', userApi);
app.use('/', projectsApi);
app.use('/', threadsApi);
app.use('/api/chat', chatApiRoute);

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error('Unhandled server error:', err?.message || err);
  return res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});

cleanupExpiredTokens();
const cleanupIntervalMs = 60 * 60 * 1000;
const cleanupInterval = setInterval(() => {
  cleanupExpiredTokens();
}, cleanupIntervalMs);

const shutdown = () => {
  server.close(() => {
    console.log('Server terminated');
    db.close();
    console.log('3) Close the database connection => OK.');
  });
  clearInterval(cleanupInterval);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
