import { Router } from 'express';
import * as tribunalController from './tribunal.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin, requireTenantMember } from '../../middleware/tenant';

const router = Router();

// Sanctions are league-private justice records: membership is required throughout.
router.use(authenticate, resolveTenant, requireTenant, requireTenantMember);

// List sanctions for the league
router.get('/sanctions', tribunalController.listSanctions);

// Get pending cases for tribunal
router.get('/pending', requireTenantAdmin, tribunalController.getPendingCases);

// Resolve a sanction (tribunal decision)
router.post('/sanctions/:id/resolve', requireTenantAdmin, tribunalController.resolveSanction);

// Check if a player is eligible to play
router.get('/eligibility/:playerId', tribunalController.checkEligibility);

// Serve a match for a sanction (after a matchday is completed)
router.post('/sanctions/serve-matchday', requireTenantAdmin, tribunalController.serveMatchday);

export default router;
