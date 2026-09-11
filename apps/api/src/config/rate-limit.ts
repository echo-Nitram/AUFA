import rateLimit from 'express-rate-limit';
import { env } from './env';

const common = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
  // Limits exist to slow down abuse, not to make local development painful.
  skip: () => !env.isProduction && process.env.RATE_LIMIT_IN_DEV !== '1',
};

/** Broad ceiling for the whole API. */
export const globalLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente en unos minutos.' },
});

/** Credential endpoints: login, register, password reset. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos. Intente nuevamente en 15 minutos.' },
});

/**
 * CI lookup. Without a tight limit this endpoint is a way to walk the national
 * identity number range and harvest the players behind it.
 */
export const lookupLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: { error: 'Demasiadas consultas por cedula. Intente nuevamente mas tarde.' },
});
