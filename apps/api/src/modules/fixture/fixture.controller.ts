import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

interface TeamAvailability {
  teamId: string;
  availableDays?: number[];
  earliestTime?: string;
  latestTime?: string;
}

/**
 * Generates a round-robin fixture for a tournament.
 * Crosses three variables:
 *  1. Available venue slots
 *  2. Team restrictions
 *  3. Home/Away balance
 */
export async function generateFixture(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;
    const { teamRestrictions, startDate } = req.body as {
      teamRestrictions?: TeamAvailability[];
      startDate?: string;
    };

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, tenantId: req.tenantId! },
      include: {
        tournamentTeams: { include: { team: { select: { id: true, name: true } } } },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const teams = tournament.tournamentTeams.map((tt) => tt.team);
    if (teams.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar fixture' });
    }

    // Get available venue slots
    const venues = await prisma.venue.findMany({
      where: { tenantId: req.tenantId! },
      include: { slots: true },
    });

    if (venues.length === 0) {
      return res.status(400).json({ error: 'No hay canchas registradas. Agregue canchas antes de generar el fixture.' });
    }

    // Generate round-robin pairings
    const pairings = generateRoundRobin(teams.map((t) => t.id));

    // Assign venue slots to matches with home/away balance
    const homeCount = new Map<string, number>();
    teams.forEach((t) => homeCount.set(t.id, 0));

    const allSlots = venues.flatMap((v) =>
      v.slots.map((s) => ({ venueId: v.id, venueName: v.name, ...s }))
    );

    const baseDate = startDate ? new Date(startDate) : new Date();
    const matches: Array<{
      tournamentId: string;
      matchday: number;
      homeTeamId: string;
      awayTeamId: string;
      venueId: string;
      scheduledAt: Date;
    }> = [];

    for (let round = 0; round < pairings.length; round++) {
      const roundMatches = pairings[round];

      for (let i = 0; i < roundMatches.length; i++) {
        let [teamA, teamB] = roundMatches[i];

        // Balance home/away
        const homeA = homeCount.get(teamA) || 0;
        const homeB = homeCount.get(teamB) || 0;

        let homeTeamId: string, awayTeamId: string;
        if (homeA <= homeB) {
          homeTeamId = teamA;
          awayTeamId = teamB;
        } else {
          homeTeamId = teamB;
          awayTeamId = teamA;
        }

        homeCount.set(homeTeamId, (homeCount.get(homeTeamId) || 0) + 1);

        // Assign slot (round-robin through available slots)
        const slotIndex = (round * roundMatches.length + i) % allSlots.length;
        const slot = allSlots[slotIndex];

        // Calculate date: one round per week
        const matchDate = new Date(baseDate);
        matchDate.setDate(matchDate.getDate() + round * 7);

        // Find the next occurrence of the slot's day of week
        while (matchDate.getDay() !== slot.dayOfWeek) {
          matchDate.setDate(matchDate.getDate() + 1);
        }

        // Set time
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        matchDate.setHours(hours, minutes, 0, 0);

        // Check team restrictions
        if (teamRestrictions) {
          const homeRestriction = teamRestrictions.find((r) => r.teamId === homeTeamId);
          const awayRestriction = teamRestrictions.find((r) => r.teamId === awayTeamId);

          if (homeRestriction?.availableDays && !homeRestriction.availableDays.includes(matchDate.getDay())) {
            continue; // Skip this slot, would need more sophisticated backtracking
          }
          if (awayRestriction?.availableDays && !awayRestriction.availableDays.includes(matchDate.getDay())) {
            continue;
          }
        }

        matches.push({
          tournamentId,
          matchday: round + 1,
          homeTeamId,
          awayTeamId,
          venueId: slot.venueId,
          scheduledAt: matchDate,
        });
      }
    }

    // Delete existing matches for this tournament (regenerate)
    await prisma.match.deleteMany({ where: { tournamentId, status: 'SCHEDULED' } });

    // Create all matches
    await prisma.match.createMany({ data: matches });

    // Update tournament status
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'IN_PROGRESS',
        currentMatchday: 1,
        startDate: matches.length > 0 ? matches[0].scheduledAt : undefined,
      },
    });

    const createdMatches = await prisma.match.findMany({
      where: { tournamentId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        venue: { select: { name: true } },
      },
      orderBy: [{ matchday: 'asc' }, { scheduledAt: 'asc' }],
    });

    res.status(201).json({
      message: `Fixture generado: ${matches.length} partidos en ${pairings.length} fechas`,
      totalMatches: matches.length,
      totalMatchdays: pairings.length,
      matches: createdMatches,
    });
  } catch (error) {
    console.error('GenerateFixture error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Round-robin tournament pairing algorithm.
 * Uses the "circle method" for scheduling.
 * Returns array of rounds, each containing pairs of team IDs.
 */
function generateRoundRobin(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds];

  // Add a BYE if odd number of teams
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const n = teams.length;
  const rounds: [string, string][][] = [];

  // Fix the first team; rotate the rest
  for (let round = 0; round < n - 1; round++) {
    const roundPairs: [string, string][] = [];

    for (let i = 0; i < n / 2; i++) {
      const home = i === 0 ? teams[0] : teams[(round + i - 1) % (n - 1) + 1];
      const awayIndex = i === 0 ? (round % (n - 1)) + 1 : (n - 1) - ((round + i - 1) % (n - 1));
      const away = teams[awayIndex] || teams[(round - i + n - 1) % (n - 1) + 1];

      // Skip BYE matches
      if (home !== 'BYE' && away !== 'BYE' && home !== away) {
        roundPairs.push([home, away]);
      }
    }

    if (roundPairs.length > 0) {
      rounds.push(roundPairs);
    }
  }

  // Simplified approach if the above produces inconsistencies
  if (rounds.length === 0) {
    const simpleRounds: [string, string][][] = [];
    const fixed = teams[0];
    const rotating = teams.slice(1);

    for (let round = 0; round < n - 1; round++) {
      const pairs: [string, string][] = [];

      // First pair: fixed vs first rotating
      if (fixed !== 'BYE' && rotating[0] !== 'BYE') {
        pairs.push([fixed, rotating[0]]);
      }

      // Remaining pairs
      for (let i = 1; i < n / 2; i++) {
        const a = rotating[i];
        const b = rotating[n - 1 - i];
        if (a !== 'BYE' && b !== 'BYE') {
          pairs.push([a, b]);
        }
      }

      if (pairs.length > 0) {
        simpleRounds.push(pairs);
      }

      // Rotate
      rotating.push(rotating.shift()!);
    }

    return simpleRounds;
  }

  return rounds;
}
