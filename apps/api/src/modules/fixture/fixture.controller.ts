import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { buildPairings } from './round-robin';
import { scheduleMatches, ScheduledMatch, TeamRestriction } from './scheduler';
import { sendEmails } from '../notifications/mailer';
import { fixturePublished } from '../notifications/templates';

const generateSchema = z.object({
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha de inicio invalida').optional(),
  /** Email each team's captain their own matches. */
  notifyTeams: z.boolean().default(true),
  /** Ida y vuelta. */
  doubleRound: z.boolean().default(false),
  teamRestrictions: z
    .array(
      z.object({
        teamId: z.string(),
        availableDays: z.array(z.number().int().min(0).max(6)).optional(),
        earliestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        latestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      })
    )
    .optional(),
});

/**
 * Emails each captain the matches their own team has to play.
 *
 * Never throws: a fixture that is already saved must not appear to have failed
 * because the mail provider is down.
 */
async function notifyTeamsOfFixture(
  tenantId: string,
  tournamentName: string,
  scheduled: ScheduledMatch[],
  teamName: Map<string, string>
): Promise<number> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    if (!tenant) return 0;
    const leagueName: string = tenant.name;

    const captains = await prisma.team.findMany({
      where: { tenantId, captainPlayerId: { not: null } },
      select: {
        id: true,
        name: true,
        captainPlayerId: true,
      },
    });

    const captainIds = captains
      .map((t) => t.captainPlayerId)
      .filter((id): id is string => id !== null);

    const players = await prisma.player.findMany({
      where: { id: { in: captainIds } },
      select: { id: true, user: { select: { email: true } } },
    });
    const emailByPlayer = new Map<string, string>(
      players.map((p): [string, string] => [p.id, p.user.email])
    );

    const emails = [];
    for (const team of captains as { id: string; name: string; captainPlayerId: string | null }[]) {
      const email = emailByPlayer.get(team.captainPlayerId!);
      if (!email) continue;

      const own = scheduled
        .filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
        .sort((a, b) => a.matchday - b.matchday)
        .map((m) => {
          const isHome = m.homeTeamId === team.id;
          const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
          return {
            matchday: m.matchday,
            opponent: teamName.get(opponentId) ?? 'Rival',
            isHome,
            venue: null,
            scheduledAt: m.scheduledAt,
          };
        });

      if (own.length === 0) continue;

      emails.push(fixturePublished(email, leagueName, team.name, tournamentName, own));
    }

    const { sent } = await sendEmails(emails);
    return sent;
  } catch (error) {
    console.error('NotifyTeamsOfFixture error:', error);
    return 0;
  }
}

/**
 * Generates the fixture for a tournament: round-robin pairings placed on the
 * league's venue slots.
 *
 * Regenerating replaces matches that have not been played. It refuses to run
 * once results exist, because the standings are already derived from them.
 */
export async function generateFixture(req: AuthRequest, res: Response) {
  try {
    const { tournamentId } = req.params;
    const options = generateSchema.parse(req.body ?? {});

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

    const playedCount = await prisma.match.count({
      where: { tournamentId, status: { not: 'SCHEDULED' } },
    });
    if (playedCount > 0) {
      return res.status(409).json({
        error:
          'Este torneo ya tiene partidos jugados. Regenerar el fixture borraria posiciones y estadisticas ya calculadas.',
      });
    }

    const venues = await prisma.venue.findMany({
      where: { tenantId: req.tenantId! },
      include: { slots: true },
    });

    const slots = venues.flatMap((v) =>
      v.slots.map((s) => ({ venueId: v.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime }))
    );

    if (slots.length === 0) {
      return res.status(400).json({
        error: 'No hay canchas con horarios cargados. Agregue canchas y sus bloques horarios antes de generar el fixture.',
      });
    }

    const teamIds = new Set(teams.map((t) => t.id));
    const restrictions = (options.teamRestrictions ?? []).filter((r) =>
      teamIds.has(r.teamId)
    ) as TeamRestriction[];

    const pairings = buildPairings(
      teams.map((t) => t.id),
      options.doubleRound
    );

    const { scheduled, unscheduled } = scheduleMatches({
      pairings,
      slots,
      startDate: options.startDate ? new Date(options.startDate) : new Date(),
      restrictions,
    });

    if (scheduled.length === 0) {
      return res.status(400).json({
        error: 'No se pudo ubicar ningun partido con las canchas y restricciones actuales.',
        unscheduled,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { tournamentId, status: 'SCHEDULED' } });
      await tx.match.createMany({
        data: scheduled.map((m) => ({
          tournamentId,
          matchday: m.matchday,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          venueId: m.venueId,
          scheduledAt: m.scheduledAt,
        })),
      });
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'IN_PROGRESS',
          currentMatchday: 1,
          startDate: scheduled[0].scheduledAt,
        },
      });
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

    const teamName = new Map<string, string>(
      teams.map((t): [string, string] => [t.id, t.name])
    );

    const notified = options.notifyTeams
      ? await notifyTeamsOfFixture(req.tenantId!, tournament.name, scheduled, teamName)
      : 0;

    res.status(201).json({
      message:
        unscheduled.length === 0
          ? `Fixture generado: ${scheduled.length} partidos en ${pairings.length} fechas`
          : `Fixture generado con ${scheduled.length} partidos. ${unscheduled.length} no pudieron ubicarse y quedaron sin programar.`,
      totalMatches: scheduled.length,
      totalMatchdays: pairings.length,
      notifiedTeams: notified,
      matches: createdMatches,
      // Named explicitly so the organizer can fix the cause rather than discover
      // the gap when the matchday arrives.
      unscheduled: unscheduled.map((m) => ({
        matchday: m.matchday,
        homeTeam: teamName.get(m.homeTeamId) ?? m.homeTeamId,
        awayTeam: teamName.get(m.awayTeamId) ?? m.awayTeamId,
        reason: m.reason,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos invalidos', details: error.errors });
    }
    console.error('GenerateFixture error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
