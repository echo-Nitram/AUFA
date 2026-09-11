import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import type { SignOptions } from 'jsonwebtoken';

// apps/api/.env wins; the monorepo root .env is the fallback (dotenv keeps the first value it sees).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const INSECURE_SECRETS = new Set([
  'dev-secret',
  'dev-refresh-secret',
  'change-me',
  'change-me-in-production',
  'change-me-refresh-in-production',
]);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * In production a secret must be explicitly set, long enough to resist offline
 * brute force, and not one of the placeholders shipped in .env.example — a
 * fallback here would let a misconfigured deploy mint valid super-admin tokens.
 */
const productionSecret = z
  .string()
  .min(32, 'debe tener al menos 32 caracteres')
  .refine((v) => !INSECURE_SECRETS.has(v), 'no puede ser un valor de ejemplo');

const secret = isProduction ? productionSecret : z.string().min(1).default('dev-secret');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: isProduction
    ? z.string().min(1, 'es obligatoria en produccion')
    : z.string().min(1).default('postgresql://aufa:aufa_secret@localhost:5432/aufa?schema=public'),

  JWT_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  AUFA_COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.04),

  // Without a key, notifications are logged instead of sent.
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('AUFA <no-reply@aufa.uy>'),
  // Shared secret the scheduled-job endpoints require.
  CRON_SECRET: z.string().optional(),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(5_242_880),

  SUPER_ADMIN_EMAIL: z.string().email().default('admin@aufa.uy'),
  SUPER_ADMIN_PASSWORD: isProduction
    ? productionSecret
    : z.string().min(1).default('change-me'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`Configuracion de entorno invalida:\n${detail}`);
  process.exit(1);
}

const raw = parsed.data;

if (raw.JWT_SECRET === raw.JWT_REFRESH_SECRET) {
  console.error(
    'Configuracion de entorno invalida:\n  - JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos'
  );
  process.exit(1);
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction,
  port: raw.API_PORT,
  apiUrl: raw.API_URL,
  webUrl: raw.WEB_URL,

  databaseUrl: raw.DATABASE_URL,

  jwt: {
    secret: raw.JWT_SECRET,
    refreshSecret: raw.JWT_REFRESH_SECRET,
    expiresIn: raw.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    refreshExpiresIn: raw.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  },

  aufaCommissionRate: raw.AUFA_COMMISSION_RATE,

  mail: {
    resendApiKey: raw.RESEND_API_KEY,
    from: raw.MAIL_FROM,
  },

  cronSecret: raw.CRON_SECRET,

  upload: {
    dir: raw.UPLOAD_DIR,
    maxFileSize: raw.MAX_FILE_SIZE,
  },

  superAdmin: {
    email: raw.SUPER_ADMIN_EMAIL,
    password: raw.SUPER_ADMIN_PASSWORD,
  },
};
