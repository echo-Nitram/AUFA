import { Router } from 'express';
import * as statsController from './stats.controller';
import { resolveTenant, requireTenant } from '../../middleware/tenant';

const router = Router();

router.use(resolveTenant, requireTenant);

// Top scorers for a tournament
router.get('/scorers/:tournamentId', statsController.getTopScorers);

// Cards leaders for a tournament
router.get('/cards/:tournamentId', statsController.getCardsLeaders);

// Assists leaders for a tournament
router.get('/assists/:tournamentId', statsController.getAssistsLeaders);

// Team stats summary
router.get('/team/:teamId/:tournamentId', statsController.getTeamStats);

// Fair play ranking
router.get('/fairplay/:tournamentId', statsController.getFairPlayRanking);

export default router;
