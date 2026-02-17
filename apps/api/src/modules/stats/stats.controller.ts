import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export async function getDashboardSummary(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;

    const [tournaments, teams, players, nextMatch, activeSanctions] = await Promise.all([
      prisma.tournament.findMany({
        where: { tenantId, status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
        select: { id: true, name: true, status: true },
      }),
      prisma.team.count({ where: { tenantId } }),
      prisma.teamPlayer.count({
        where: { team: { tenantId }, isActive: true },
      }),
      prisma.match.findFirst({
        where: {
          tournament: { tenantId },
          status: 'SCHEDULED',
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          venue: { select: { name: true } },
        },
      }),
      prisma.sanction.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    // Count scheduled matches per matchday to find the "next" matchday
    let nextMatchday: number | null = null;
    if (nextMatch) {
      nextMatchday = nextMatch.matchday;
    }

    // Count completed vs total matches
    const [completedMatches, totalMatches] = await Promise.all([
      prisma.match.count({
        where: { tournament: { tenantId }, status: 'COMPLETED' },
      }),
      prisma.match.count({
        where: { tournament: { tenantId } },
      }),
    ]);

    res.json({
      activeTournaments: tournaments.length,
      tournaments: tournaments.map(t => ({ id: t.id, name: t.name, status: t.status })),
      totalTeams: teams,
      totalPlayers: players,
      nextMatchday,
      nextMatch: nextMatch ? {
        id: nextMatch.id,
        home: nextMatch.homeTeam.name,
        away: nextMatch.awayTeam.name,
        venue: nextMatch.venue?.name,
        scheduledAt: nextMatch.scheduledAt,
      } : null,
      matchProgress: { completed: completedMatches, total: totalMatches },
      activeSanctions,
    });
  } catch (error) {
    console.error('GetDashboardSummary error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getTopScorers(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const goals = await prisma.goal.findMany({
      where: { match: { tournamentId, tournament: { tenantId: req.tenantId! } } },
      include: {
        player: { select: { id: true, fullName: true, photoUrl: true, aufaId: true } },
      },
    });

    // Aggregate by player
    const scorerMap = new Map<string, { player: any; goals: number; teamId: string }>();
    for (const goal of goals) {
      const entry = scorerMap.get(goal.playerId) || { player: goal.player, goals: 0, teamId: goal.teamId };
      entry.goals++;
      scorerMap.set(goal.playerId, entry);
    }

    // Get team names
    const teamIds = [...new Set([...scorerMap.values()].map((e) => e.teamId))];
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    const scorers = [...scorerMap.values()]
      .sort((a, b) => b.goals - a.goals)
      .slice(0, limit)
      .map((e, i) => ({
        position: i + 1,
        playerId: e.player.id,
        playerName: e.player.fullName,
        photoUrl: e.player.photoUrl,
        teamName: teamMap.get(e.teamId) || '',
        goals: e.goals,
      }));

    res.json(scorers);
  } catch (error) {
    console.error('GetTopScorers error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getCardsLeaders(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;

    const cards = await prisma.card.findMany({
      where: { match: { tournamentId, tournament: { tenantId: req.tenantId! } } },
      include: {
        player: { select: { id: true, fullName: true, photoUrl: true } },
      },
    });

    const cardMap = new Map<string, { player: any; yellows: number; reds: number; teamId: string }>();
    for (const card of cards) {
      const entry = cardMap.get(card.playerId) || { player: card.player, yellows: 0, reds: 0, teamId: card.teamId };
      if (card.type === 'YELLOW') entry.yellows++;
      else entry.reds++;
      cardMap.set(card.playerId, entry);
    }

    const teamIds = [...new Set([...cardMap.values()].map((e) => e.teamId))];
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    const leaders = [...cardMap.values()]
      .sort((a, b) => (b.reds * 10 + b.yellows) - (a.reds * 10 + a.yellows))
      .slice(0, 20)
      .map((e, i) => ({
        position: i + 1,
        playerId: e.player.id,
        playerName: e.player.fullName,
        photoUrl: e.player.photoUrl,
        teamName: teamMap.get(e.teamId) || '',
        yellowCards: e.yellows,
        redCards: e.reds,
      }));

    res.json(leaders);
  } catch (error) {
    console.error('GetCardsLeaders error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getAssistsLeaders(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;

    const assists = await prisma.goal.findMany({
      where: {
        match: { tournamentId, tournament: { tenantId: req.tenantId! } },
        assistPlayerId: { not: null },
      },
      include: {
        assistPlayer: { select: { id: true, fullName: true, photoUrl: true } },
      },
    });

    const assistMap = new Map<string, { player: any; assists: number; teamId: string }>();
    for (const goal of assists) {
      if (!goal.assistPlayerId || !goal.assistPlayer) continue;
      const entry = assistMap.get(goal.assistPlayerId) || { player: goal.assistPlayer, assists: 0, teamId: goal.teamId };
      entry.assists++;
      assistMap.set(goal.assistPlayerId, entry);
    }

    const teamIds = [...new Set([...assistMap.values()].map((e) => e.teamId))];
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    const leaders = [...assistMap.values()]
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 20)
      .map((e, i) => ({
        position: i + 1,
        playerId: e.player.id,
        playerName: e.player.fullName,
        photoUrl: e.player.photoUrl,
        teamName: teamMap.get(e.teamId) || '',
        assists: e.assists,
      }));

    res.json(leaders);
  } catch (error) {
    console.error('GetAssistsLeaders error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getTeamStats(req: AuthRequest, res: Response) {
  try {
    const { teamId, tournamentId } = req.params;

    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: 'COMPLETED',
      },
      include: {
        goals: { include: { player: { select: { fullName: true } } } },
        cards: true,
      },
    });

    const goals = matches.flatMap((m) => m.goals.filter((g) => g.teamId === teamId));
    const goalsAgainst = matches.flatMap((m) => m.goals.filter((g) => g.teamId !== teamId));
    const cards = matches.flatMap((m) => m.cards.filter((c) => c.teamId === teamId));

    res.json({
      matchesPlayed: matches.length,
      goalsScored: goals.length,
      goalsConceded: goalsAgainst.length,
      yellowCards: cards.filter((c) => c.type === 'YELLOW').length,
      redCards: cards.filter((c) => c.type === 'RED').length,
      cleanSheets: matches.filter((m) => {
        const conceded = m.goals.filter((g) => g.teamId !== teamId).length;
        return conceded === 0;
      }).length,
    });
  } catch (error) {
    console.error('GetTeamStats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getFairPlayRanking(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;

    const standings = await prisma.tournamentTeam.findMany({
      where: { tournamentId },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
    });

    const ranking = standings
      .map((s) => ({
        teamId: s.teamId,
        teamName: s.team.name,
        fairPlayScore: s.fairPlayCount > 0 ? Math.round((s.fairPlaySum / s.fairPlayCount) * 100) / 100 : 0,
        totalRatings: s.fairPlayCount,
      }))
      .sort((a, b) => b.fairPlayScore - a.fairPlayScore)
      .map((e, i) => ({ position: i + 1, ...e }));

    res.json(ranking);
  } catch (error) {
    console.error('GetFairPlayRanking error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
