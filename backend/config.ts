require('dotenv').config();

const { z } = require('zod');
const logger = require('./logger');

const envSchema = z.object({
  SECRET_KEY: z.string().min(1, 'SECRET_KEY is required'),
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),
  PORT: z.string().default('3001'),
  DB_CLIENT: z.enum(['sqlite', 'postgres']).default('sqlite'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  APP_URL: z.string().optional(),
});

const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    logger.error({ err: error }, 'Environment validation failed');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err: any) => {
        logger.error({ path: err.path, message: err.message }, 'Missing or invalid env var');
      });
    }
    process.exit(1);
  }
};

const config = validateEnv();

module.exports = config;
