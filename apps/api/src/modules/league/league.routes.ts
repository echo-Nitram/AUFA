import { Router } from 'express';
import * as leagueController from './league.controller';
import { authenticate } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';

const router = Router();

// All league routes require tenant context
router.use(resolveTenant, requireTenant);

// Tournaments
router.post('/tournaments', authenticate, requireTenantAdmin, leagueController.createTournament);
router.get('/tournaments', leagueController.listTournaments);
router.get('/tournaments/:id', leagueController.getTournament);
router.put('/tournaments/:id', authenticate, requireTenantAdmin, leagueController.updateTournament);
router.get('/tournaments/:id/standings', leagueController.getStandings);

// Teams
router.post('/teams', authenticate, requireTenantAdmin, leagueController.createTeam);
router.get('/teams', leagueController.listTeams);
router.get('/teams/:id', leagueController.getTeam);
router.post('/teams/:teamId/players', authenticate, requireTenantAdmin, leagueController.addPlayerToTeam);
router.delete('/teams/:teamId/players/:playerId', authenticate, requireTenantAdmin, leagueController.removePlayerFromTeam);

// Invite link for fichaje
router.post('/teams/:teamId/invite', authenticate, requireTenantAdmin, leagueController.generateInviteLink);
router.post('/teams/join/:inviteCode', authenticate, leagueController.joinTeamByInvite);

// Tournament registration
router.post('/tournaments/:tournamentId/register/:teamId', authenticate, requireTenantAdmin, leagueController.registerTeamInTournament);

// Venues
router.post('/venues', authenticate, requireTenantAdmin, leagueController.createVenue);
router.get('/venues', leagueController.listVenues);
router.put('/venues/:id', authenticate, requireTenantAdmin, leagueController.updateVenue);
router.delete('/venues/:id', authenticate, requireTenantAdmin, leagueController.deleteVenue);

export default router;
