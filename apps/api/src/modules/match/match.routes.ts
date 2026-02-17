import { Router } from 'express';
import * as matchController from './match.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';

const router = Router();

router.use(resolveTenant, requireTenant);

// Match management
router.get('/tournament/:tournamentId', matchController.listMatches);
router.get('/:id', matchController.getMatch);

// Get match rosters with eligibility for lineup selection
router.get('/:id/rosters', authenticate, matchController.getMatchRosters);

// Match data entry (post-match by operator)
router.post('/:id/data', authenticate, requireTenantAdmin, matchController.enterMatchData);

// Assign referee
router.put('/:id/referee', authenticate, requireTenantAdmin, matchController.assignReferee);

// Get match stats summary
router.get('/:id/stats', matchController.getMatchStats);

export default router;
