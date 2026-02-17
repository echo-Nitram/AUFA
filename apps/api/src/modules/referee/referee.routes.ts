import { Router } from 'express';
import * as refereeController from './referee.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';

const router = Router();

// Public: browse referee marketplace
router.get('/available', refereeController.listAvailableReferees);
router.get('/:id', refereeController.getRefereeProfile);

// Referee: manage own profile
router.post('/register', authenticate, refereeController.registerAsReferee);
router.put('/profile', authenticate, refereeController.updateRefereeProfile);
router.put('/availability', authenticate, refereeController.updateAvailability);

// League: hire referees
router.post(
  '/hire',
  authenticate,
  resolveTenant,
  requireTenant,
  requireTenantAdmin,
  refereeController.hireReferee
);

export default router;
