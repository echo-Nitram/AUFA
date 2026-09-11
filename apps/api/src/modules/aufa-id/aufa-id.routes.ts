import { Router } from 'express';
import * as aufaIdController from './aufa-id.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';
import { lookupLimiter } from '../../config/rate-limit';

const router = Router();

// League Admin: look up a player by CI during the fichaje flow.
// Returns name, photo and medical status, so it is not public.
router.get(
  '/lookup/:ci',
  lookupLimiter,
  authenticate,
  resolveTenant,
  requireTenant,
  requireTenantAdmin,
  aufaIdController.lookupByCI
);

// Player: upload identity documents
router.post('/identity/upload', authenticate, aufaIdController.uploadIdentityDocs);

// Player: upload medical clearance
router.post('/medical/upload', authenticate, aufaIdController.uploadMedicalClearance);

// Sporting passport: career record across leagues. Requires a session.
router.get('/passport/:playerId', authenticate, aufaIdController.getPassport);

// League Admin: validate player identity
router.post(
  '/identity/:playerId/validate',
  authenticate,
  resolveTenant,
  requireTenant,
  requireTenantAdmin,
  aufaIdController.validateIdentity
);

// Medical clearance status: the player themselves, or an admin of their league.
router.get('/medical/:playerId/status', authenticate, aufaIdController.getMedicalStatus);

export default router;
