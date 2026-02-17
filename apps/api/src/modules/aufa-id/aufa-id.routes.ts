import { Router } from 'express';
import * as aufaIdController from './aufa-id.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';

const router = Router();

// Player: lookup by CI (for registration flow)
router.get('/lookup/:ci', aufaIdController.lookupByCI);

// Player: upload identity documents
router.post('/identity/upload', authenticate, aufaIdController.uploadIdentityDocs);

// Player: upload medical clearance
router.post('/medical/upload', authenticate, aufaIdController.uploadMedicalClearance);

// Player: get passport (career stats across all leagues)
router.get('/passport/:playerId', aufaIdController.getPassport);

// League Admin: validate player identity
router.post(
  '/identity/:playerId/validate',
  authenticate,
  resolveTenant,
  requireTenant,
  requireTenantAdmin,
  aufaIdController.validateIdentity
);

// Check medical clearance status
router.get('/medical/:playerId/status', authenticate, aufaIdController.getMedicalStatus);

export default router;
