require('dotenv').config();
const config = require('./config');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const pinoHttp = require('pino-http');
const logger = require('./logger');

const db = require('./models/database');
const auth = require('./routes/auth');
const { cleanupExpiredTokens } = require('./controllers/authController');
const userApi = require('./routes/users-api');
const projectsApi = require('./routes/projects');
const threadsApi = require('./routes/threads');
const chatApiRoute = require('./routes/chatApi');
const searchApi = require('./routes/search');

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
    'X-Request-Id',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 204,
};

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.SECRET_KEY,
  cookieName: '__csrf',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', normalizeTrustProxy(process.env.TRUST_PROXY));
const apiUrl = (process.env.CORS_ALLOWED_ORIGINS || process.env.APP_URL || '').split(',').map(v => v.trim()).filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", ...apiUrl],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: '15mb' }));
app.use(express.json({ limit: '15mb' }));
let requestCounter = 0;
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => {
      const clientReqId = req.headers['x-request-id'];
      if (clientReqId && typeof clientReqId === 'string') return clientReqId;
      requestCounter += 1;
      return `req-${requestCounter}`;
    },
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.get('/healthz', (_req, res) => {
  db.get('SELECT 1 AS ok', [], (err, row) => {
    if (err || !row) {
      return res.status(503).json({
        status: 'unhealthy',
        db: 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(200).json({
      status: 'ok',
      db: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
});

const csrfExcludedPaths = new Set(['/healthz', '/login', '/register', '/reset-password-request', '/verify-email']);
app.use((req, res, next) => {
  if (csrfExcludedPaths.has(req.path)) return next();
  return doubleCsrfProtection(req, res, next);
});

app.use('/', auth);
app.use('/', userApi);
app.use('/', projectsApi);
app.use('/', threadsApi);
app.use('/api/chat', chatApiRoute);
app.use('/', searchApi);

if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

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
  logger.error({ err: err?.message || err }, 'Unhandled server error');
  return res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  logger.info({ host: HOST, port: PORT }, 'Server running');
});

cleanupExpiredTokens();
const cleanupIntervalMs = 60 * 60 * 1000;
const cleanupInterval = setInterval(() => {
  cleanupExpiredTokens();
}, cleanupIntervalMs);

const shutdown = () => {
  logger.info('Shutdown signal received');
  clearInterval(cleanupInterval);

  server.close(() => {
    logger.info('HTTP server closed');
    db.close(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
