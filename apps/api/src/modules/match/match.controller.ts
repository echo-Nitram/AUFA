import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

const matchDataSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homeFairPlay: z.number().min(1).max(5),
  awayFairPlay: z.number().min(1).max(5),
  homeLineup: z.array(z.string()),
  awayLineup: z.array(z.string()),
  goals: z.array(z.object({
    playerId: z.string(),
    teamId: z.string(),
    minute: z.number().int(),
    assistPlayerId: z.string().optional(),
  })),
  cards: z.array(z.object({
    playerId: z.string(),
    teamId: z.string(),
    minute: z.number().int(),
    type: z.enum(['YELLOW', 'RED']),
    reason: z.string().optional(),
  })),
  substitutions: z.array(z.object({
    playerOutId: z.string(),
    playerInId: z.string(),
    teamId: z.string(),
    minute: z.number().int(),
  })),
  incidents: z.string().optional(),
});

export async function listMatches(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;
    const { matchday, status } = req.query;

    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        tournament: { tenantId: req.tenantId! },
        ...(matchday && { matchday: parseInt(matchday as string) }),
        ...(status && { status: status as any }),
      },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        venue: { select: { id: true, name: true } },
        referee: { select: { id: true, fullName: true } },
      },
      orderBy: [{ matchday: 'asc' }, { scheduledAt: 'asc' }],
    });

    res.json(matches);
  } catch (error) {
    console.error('ListMatches error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMatch(req: AuthRequest, res: Response) {
  try {
    const match = await prisma.match.findFirst({
      where: { id: req.params.id },
      include: {
        homeTeam: { select: { id: true, name: true, logoUrl: true } },
        awayTeam: { select: { id: true, name: true, logoUrl: true } },
        venue: { select: { id: true, name: true, address: true } },
        referee: { select: { id: true, fullName: true } },
        goals: { include: { player: { select: { fullName: true } } }, orderBy: { minute: 'asc' } },
        cards: { include: { player: { select: { fullName: true } } }, orderBy: { minute: 'asc' } },
        substitutions: {
          include: {
            playerOut: { select: { fullName: true } },
            playerIn: { select: { fullName: true } },
          },
          orderBy: { minute: 'asc' },
        },
        lineups: {
          include: { player: { select: { id: true, fullName: true, photoUrl: true } } },
        },
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    res.json(match);
  } catch (error) {
    console.error('GetMatch error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Post-match data entry by league operator.
 * Processes all match events and updates standings/sanctions automatically.
 */
export async function enterMatchData(req: AuthRequest, res: Response) {
  try {
    const data = matchDataSchema.parse(req.body);
    const matchId = req.params.id;

    const match = await prisma.match.findFirst({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (match.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Los datos de este partido ya fueron cargados' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update match scores and status
      await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          homeFairPlay: data.homeFairPlay,
          awayFairPlay: data.awayFairPlay,
          status: 'COMPLETED',
          incidents: data.incidents,
        },
      });

      // 2. Create lineups
      const allLineups = [
        ...data.homeLineup.map((playerId) => ({ matchId, playerId, teamId: match.homeTeamId, isStarter: true })),
        ...data.awayLineup.map((playerId) => ({ matchId, playerId, teamId: match.awayTeamId, isStarter: true })),
      ];
      if (allLineups.length > 0) {
        await tx.matchLineup.createMany({ data: allLineups });
      }

      // 3. Create goals
      if (data.goals.length > 0) {
        await tx.goal.createMany({
          data: data.goals.map((g) => ({ matchId, ...g })),
        });
      }

      // 4. Create cards
      if (data.cards.length > 0) {
        await tx.card.createMany({
          data: data.cards.map((c) => ({ matchId, ...c })),
        });
      }

      // 5. Create substitutions
      if (data.substitutions.length > 0) {
        await tx.substitution.createMany({
          data: data.substitutions.map((s) => ({ matchId, ...s })),
        });
      }

      // 6. Update standings
      const homeResult = data.homeScore > data.awayScore ? 'W' : data.homeScore < data.awayScore ? 'L' : 'D';
      const tournament = match.tournament;

      // Home team standings
      await tx.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.homeTeamId } },
        data: {
          played: { increment: 1 },
          won: { increment: homeResult === 'W' ? 1 : 0 },
          drawn: { increment: homeResult === 'D' ? 1 : 0 },
          lost: { increment: homeResult === 'L' ? 1 : 0 },
          goalsFor: { increment: data.homeScore },
          goalsAgainst: { increment: data.awayScore },
          points: {
            increment:
              homeResult === 'W' ? tournament.pointsForWin :
              homeResult === 'D' ? tournament.pointsForDraw :
              tournament.pointsForLoss,
          },
          fairPlaySum: { increment: data.homeFairPlay },
          fairPlayCount: { increment: 1 },
        },
      });

      // Away team standings
      const awayResult = homeResult === 'W' ? 'L' : homeResult === 'L' ? 'W' : 'D';
      await tx.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId: match.tournamentId, teamId: match.awayTeamId } },
        data: {
          played: { increment: 1 },
          won: { increment: awayResult === 'W' ? 1 : 0 },
          drawn: { increment: awayResult === 'D' ? 1 : 0 },
          lost: { increment: awayResult === 'L' ? 1 : 0 },
          goalsFor: { increment: data.awayScore },
          goalsAgainst: { increment: data.homeScore },
          points: {
            increment:
              awayResult === 'W' ? tournament.pointsForWin :
              awayResult === 'D' ? tournament.pointsForDraw :
              tournament.pointsForLoss,
          },
          fairPlaySum: { increment: data.awayFairPlay },
          fairPlayCount: { increment: 1 },
        },
      });

      // 7. Process sanctions automatically
      // Group cards by player to detect double yellows
      const playerCards = new Map<string, { yellows: number; reds: number }>();
      for (const card of data.cards) {
        const current = playerCards.get(card.playerId) || { yellows: 0, reds: 0 };
        if (card.type === 'YELLOW') current.yellows++;
        else current.reds++;
        playerCards.set(card.playerId, current);
      }

      for (const [playerId, counts] of playerCards) {
        // Double yellow = 1 match suspension (auto-applied)
        if (counts.yellows >= 2) {
          await tx.sanction.create({
            data: {
              tenantId: match.tournament.tenantId,
              playerId,
              matchId,
              severity: 'LIGHT',
              status: 'AUTO_APPLIED',
              reason: 'Doble amarilla',
              matchesSuspended: 1,
              isActive: true,
            },
          });
        }

        // Red card = sent to tribunal
        if (counts.reds > 0) {
          await tx.sanction.create({
            data: {
              tenantId: match.tournament.tenantId,
              playerId,
              matchId,
              severity: 'GRAVE',
              status: 'PENDING_TRIBUNAL',
              reason: data.cards.find((c) => c.playerId === playerId && c.type === 'RED')?.reason || 'Roja directa',
              matchesSuspended: 0, // Tribunal will decide
              isActive: true,
            },
          });
        }
      }
    });

    res.json({ message: 'Datos del partido cargados exitosamente. Posiciones y sanciones actualizadas.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('EnterMatchData error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function assignReferee(req: AuthRequest, res: Response) {
  try {
    const { refereeId } = req.body;

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { refereeId },
      include: { referee: { select: { fullName: true } } },
    });

    res.json({ message: `Árbitro ${match.referee?.fullName} asignado al partido`, match });
  } catch (error) {
    console.error('AssignReferee error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMatchStats(req: AuthRequest, res: Response) {
  try {
    const matchId = req.params.id;

    const [goals, cards] = await Promise.all([
      prisma.goal.findMany({
        where: { matchId },
        include: {
          player: { select: { fullName: true } },
          assistPlayer: { select: { fullName: true } },
        },
        orderBy: { minute: 'asc' },
      }),
      prisma.card.findMany({
        where: { matchId },
        include: { player: { select: { fullName: true } } },
        orderBy: { minute: 'asc' },
      }),
    ]);

    res.json({ goals, cards });
  } catch (error) {
    console.error('GetMatchStats error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
