import { Router } from 'express';
import * as fixtureController from './fixture.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';

const router = Router();

router.use(resolveTenant, requireTenant);

// Generate fixture for a tournament
router.post(
  '/generate/:tournamentId',
  authenticate,
  requireTenantAdmin,
  fixtureController.generateFixture
);

export default router;
