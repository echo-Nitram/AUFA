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

    // Validate lineup players are eligible
    const allLineupIds = [...data.homeLineup, ...data.awayLineup];
    if (allLineupIds.length > 0) {
      // Check all players belong to their respective teams
      const [homeRoster, awayRoster] = await Promise.all([
        prisma.teamPlayer.findMany({
          where: { teamId: match.homeTeamId, isActive: true },
          select: { playerId: true },
        }),
        prisma.teamPlayer.findMany({
          where: { teamId: match.awayTeamId, isActive: true },
          select: { playerId: true },
        }),
      ]);
      const homeIds = new Set(homeRoster.map(r => r.playerId));
      const awayIds = new Set(awayRoster.map(r => r.playerId));

      for (const pid of data.homeLineup) {
        if (!homeIds.has(pid)) {
          return res.status(400).json({ error: `Jugador ${pid} no pertenece al equipo local` });
        }
      }
      for (const pid of data.awayLineup) {
        if (!awayIds.has(pid)) {
          return res.status(400).json({ error: `Jugador ${pid} no pertenece al equipo visitante` });
        }
      }

      // Check active sanctions
      const activeSanctions = await prisma.sanction.findMany({
        where: {
          tenantId: match.tournament.tenantId,
          playerId: { in: allLineupIds },
          isActive: true,
        },
        include: { player: { select: { fullName: true } } },
      });

      const blocked = activeSanctions.filter(
        s => s.matchesServed < s.matchesSuspended || s.status === 'PENDING_TRIBUNAL'
      );
      if (blocked.length > 0) {
        return res.status(400).json({
          error: 'Hay jugadores sancionados en la alineación',
          players: blocked.map(s => ({
            name: s.player.fullName,
            reason: s.status === 'PENDING_TRIBUNAL'
              ? 'Pendiente tribunal'
              : `Suspendido: ${s.matchesSuspended - s.matchesServed} fecha(s) - ${s.reason}`,
          })),
        });
      }

      // Check medical clearances
      const players = await prisma.player.findMany({
        where: { id: { in: allLineupIds } },
        include: {
          medicalClearances: {
            where: { isActive: true, expiresAt: { gte: new Date() } },
            take: 1,
          },
        },
      });

      const noMedical = players.filter(p => p.medicalClearances.length === 0);
      if (noMedical.length > 0) {
        return res.status(400).json({
          error: 'Hay jugadores sin ficha médica vigente',
          players: noMedical.map(p => ({ name: p.fullName, reason: 'Sin ficha médica vigente' })),
        });
      }
    }

    // Validate goal/card player IDs are in lineup
    for (const goal of data.goals) {
      if (!allLineupIds.includes(goal.playerId)) {
        return res.status(400).json({ error: `Goleador ${goal.playerId} no está en la alineación` });
      }
    }
    for (const card of data.cards) {
      if (!allLineupIds.includes(card.playerId)) {
        return res.status(400).json({ error: `Jugador tarjeteado ${card.playerId} no está en la alineación` });
      }
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

      // Fair play bonus: award extra points if score >= 4 (out of 5)
      const homeFPBonus = (tournament.fairPlayBonusPoints > 0 && data.homeFairPlay >= 4) ? tournament.fairPlayBonusPoints : 0;
      const awayFPBonus = (tournament.fairPlayBonusPoints > 0 && data.awayFairPlay >= 4) ? tournament.fairPlayBonusPoints : 0;

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
              (homeResult === 'W' ? tournament.pointsForWin :
              homeResult === 'D' ? tournament.pointsForDraw :
              tournament.pointsForLoss) + homeFPBonus,
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
              (awayResult === 'W' ? tournament.pointsForWin :
              awayResult === 'D' ? tournament.pointsForDraw :
              tournament.pointsForLoss) + awayFPBonus,
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

/**
 * Get both teams' rosters for a match, with eligibility status per player.
 * Used by the frontend lineup selection UI.
 */
export async function getMatchRosters(req: AuthRequest, res: Response) {
  try {
    const match = await prisma.match.findFirst({
      where: { id: req.params.id },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        tournament: { select: { tenantId: true } },
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    const tenantId = match.tournament.tenantId;

    // Get both teams' active players
    const [homePlayers, awayPlayers] = await Promise.all([
      prisma.teamPlayer.findMany({
        where: { teamId: match.homeTeamId, isActive: true },
        include: {
          player: {
            select: {
              id: true, aufaId: true, fullName: true, photoUrl: true,
              identityStatus: true,
              medicalClearances: {
                where: { isActive: true },
                orderBy: { expiresAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.teamPlayer.findMany({
        where: { teamId: match.awayTeamId, isActive: true },
        include: {
          player: {
            select: {
              id: true, aufaId: true, fullName: true, photoUrl: true,
              identityStatus: true,
              medicalClearances: {
                where: { isActive: true },
                orderBy: { expiresAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    // Get active sanctions for all players in this tenant
    const allPlayerIds = [...homePlayers, ...awayPlayers].map(tp => tp.playerId);
    const activeSanctions = await prisma.sanction.findMany({
      where: {
        tenantId,
        playerId: { in: allPlayerIds },
        isActive: true,
      },
    });

    const sanctionMap = new Map<string, typeof activeSanctions[0]>();
    for (const s of activeSanctions) {
      if (s.matchesServed < s.matchesSuspended || s.status === 'PENDING_TRIBUNAL') {
        sanctionMap.set(s.playerId, s);
      }
    }

    function mapPlayer(tp: typeof homePlayers[0]) {
      const p = tp.player;
      const sanction = sanctionMap.get(p.id);
      const hasMedical = p.medicalClearances.length > 0 &&
        new Date(p.medicalClearances[0].expiresAt) >= new Date();
      const isIdentityOk = p.identityStatus === 'APPROVED';

      const reasons: string[] = [];
      if (sanction) {
        if (sanction.status === 'PENDING_TRIBUNAL') {
          reasons.push('Pendiente tribunal');
        } else {
          reasons.push(`Suspendido: ${sanction.matchesSuspended - sanction.matchesServed} fecha(s)`);
        }
      }
      if (!hasMedical) reasons.push('Sin ficha médica vigente');
      if (!isIdentityOk) reasons.push(`Identidad: ${p.identityStatus}`);

      return {
        playerId: p.id,
        aufaId: p.aufaId,
        fullName: p.fullName,
        photoUrl: p.photoUrl,
        shirtNumber: tp.shirtNumber,
        eligible: reasons.length === 0,
        reasons,
      };
    }

    res.json({
      matchId: match.id,
      home: {
        teamId: match.homeTeamId,
        teamName: match.homeTeam.name,
        players: homePlayers.map(mapPlayer),
      },
      away: {
        teamId: match.awayTeamId,
        teamName: match.awayTeam.name,
        players: awayPlayers.map(mapPlayer),
      },
    });
  } catch (error) {
    console.error('GetMatchRosters error:', error);
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

export async function assignVenue(req: AuthRequest, res: Response) {
  try {
    const { venueId } = req.body;

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { venueId: venueId || null },
      include: { venue: { select: { name: true } } },
    });

    res.json({
      message: venueId
        ? `Cancha "${match.venue?.name}" asignada al partido`
        : 'Cancha removida del partido',
      match,
    });
  } catch (error) {
    console.error('AssignVenue error:', error);
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
