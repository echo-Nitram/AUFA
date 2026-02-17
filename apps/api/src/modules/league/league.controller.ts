import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import crypto from 'crypto';

const createTournamentSchema = z.object({
  name: z.string().min(2).max(100),
  gameType: z.enum(['F5', 'F7', 'F11']),
  pointsForWin: z.number().int().default(3),
  pointsForDraw: z.number().int().default(1),
  pointsForLoss: z.number().int().default(0),
  fairPlayBonusPoints: z.number().int().default(0),
  tiebreakerOrder: z.array(z.enum(['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD', 'FAIR_PLAY'])).default(['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD']),
  maxSubstitutions: z.number().int().nullable().default(null),
  playersPerTeam: z.number().int(),
  minPlayersToStart: z.number().int(),
  maxTeams: z.number().int().nullable().default(null),
  registrationFee: z.number().nullable().default(null),
  depositAmount: z.number().nullable().default(null),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function createTournament(req: AuthRequest, res: Response) {
  try {
    const data = createTournamentSchema.parse(req.body);
    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        tenantId: req.tenantId!,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    res.status(201).json(tournament);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('CreateTournament error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listTournaments(req: AuthRequest, res: Response) {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { tenantId: req.tenantId! },
      include: { _count: { select: { tournamentTeams: true, matches: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tournaments);
  } catch (error) {
    console.error('ListTournaments error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getTournament(req: AuthRequest, res: Response) {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: {
        tournamentTeams: {
          include: { team: { select: { id: true, name: true, logoUrl: true } } },
          orderBy: [{ points: 'desc' }, { goalsFor: 'desc' }],
        },
        _count: { select: { matches: true } },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    res.json(tournament);
  } catch (error) {
    console.error('GetTournament error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateTournament(req: AuthRequest, res: Response) {
  try {
    const tournament = await prisma.tournament.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(tournament);
  } catch (error) {
    console.error('UpdateTournament error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getStandings(req: AuthRequest, res: Response) {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const standings = await prisma.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: [
        { points: 'desc' },
        { goalsFor: 'desc' }, // Will be refined by tiebreaker config
      ],
    });

    // Apply tiebreaker sorting based on tournament config
    const sorted = applyTiebreakers(standings, tournament.tiebreakerOrder);

    res.json(
      sorted.map((s, i) => ({
        position: i + 1,
        teamId: s.teamId,
        teamName: s.team.name,
        teamLogoUrl: s.team.logoUrl,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalsFor - s.goalsAgainst,
        points: s.points,
        fairPlayScore: s.fairPlayCount > 0 ? s.fairPlaySum / s.fairPlayCount : 0,
      }))
    );
  } catch (error) {
    console.error('GetStandings error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

function applyTiebreakers(standings: any[], order: string[]) {
  return [...standings].sort((a, b) => {
    // Primary: points
    if (a.points !== b.points) return b.points - a.points;

    // Apply configured tiebreakers
    for (const criteria of order) {
      switch (criteria) {
        case 'GOAL_DIFFERENCE': {
          const diffA = a.goalsFor - a.goalsAgainst;
          const diffB = b.goalsFor - b.goalsAgainst;
          if (diffA !== diffB) return diffB - diffA;
          break;
        }
        case 'GOALS_FOR':
          if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
          break;
        case 'FAIR_PLAY': {
          const fpA = a.fairPlayCount > 0 ? a.fairPlaySum / a.fairPlayCount : 0;
          const fpB = b.fairPlayCount > 0 ? b.fairPlaySum / b.fairPlayCount : 0;
          if (fpA !== fpB) return fpB - fpA;
          break;
        }
        // HEAD_TO_HEAD requires match data lookup - would need additional query
      }
    }
    return 0;
  });
}

export async function createTeam(req: AuthRequest, res: Response) {
  try {
    const { name, logoUrl, captainPlayerId } = req.body;

    const team = await prisma.team.create({
      data: {
        tenantId: req.tenantId!,
        name,
        logoUrl,
        captainPlayerId,
      },
    });

    // If captain specified, add them as a team player
    if (captainPlayerId) {
      await prisma.teamPlayer.create({
        data: { teamId: team.id, playerId: captainPlayerId },
      });
    }

    res.status(201).json(team);
  } catch (error) {
    console.error('CreateTeam error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listTeams(req: AuthRequest, res: Response) {
  try {
    const teams = await prisma.team.findMany({
      where: { tenantId: req.tenantId! },
      include: { _count: { select: { teamPlayers: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (error) {
    console.error('ListTeams error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getTeam(req: AuthRequest, res: Response) {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: {
        teamPlayers: {
          where: { isActive: true },
          include: { player: { select: { id: true, aufaId: true, fullName: true, photoUrl: true } } },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(team);
  } catch (error) {
    console.error('GetTeam error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function addPlayerToTeam(req: AuthRequest, res: Response) {
  try {
    const { playerId, shirtNumber } = req.body;
    const { teamId } = req.params;

    // Validate: player exists
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Validate: not sanctioned in this league
    const activeSanction = await prisma.sanction.findFirst({
      where: { playerId, tenantId: req.tenantId!, isActive: true },
    });

    // Validate: medical clearance
    const medicalClearance = await prisma.medicalClearance.findFirst({
      where: { playerId, isActive: true, expiresAt: { gte: new Date() } },
    });
    if (!medicalClearance) {
      return res.status(400).json({ error: 'Jugador sin ficha médica vigente' });
    }

    // Validate: not already in another team in this league
    const existingTeam = await prisma.teamPlayer.findFirst({
      where: {
        playerId,
        isActive: true,
        team: { tenantId: req.tenantId! },
      },
    });
    if (existingTeam) {
      return res.status(409).json({ error: 'Jugador ya fichado en otro equipo de esta liga' });
    }

    const teamPlayer = await prisma.teamPlayer.create({
      data: { teamId, playerId, shirtNumber },
    });

    res.status(201).json({
      message: 'Jugador fichado exitosamente',
      teamPlayer,
      warnings: activeSanction ? ['Jugador tiene sanción activa en esta liga'] : [],
    });
  } catch (error) {
    console.error('AddPlayerToTeam error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function removePlayerFromTeam(req: AuthRequest, res: Response) {
  try {
    await prisma.teamPlayer.updateMany({
      where: {
        teamId: req.params.teamId,
        playerId: req.params.playerId,
        isActive: true,
      },
      data: { isActive: false, leftAt: new Date() },
    });

    res.json({ message: 'Jugador dado de baja del equipo' });
  } catch (error) {
    console.error('RemovePlayerFromTeam error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Simple invite code system (stored in memory for simplicity; production would use DB/Redis)
const inviteCodes = new Map<string, { teamId: string; tenantId: string; expiresAt: Date }>();

export async function generateInviteLink(req: AuthRequest, res: Response) {
  try {
    const code = crypto.randomBytes(6).toString('hex');
    inviteCodes.set(code, {
      teamId: req.params.teamId,
      tenantId: req.tenantId!,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    res.json({ inviteCode: code, inviteUrl: `${process.env.WEB_URL}/join/${code}` });
  } catch (error) {
    console.error('GenerateInviteLink error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function joinTeamByInvite(req: AuthRequest, res: Response) {
  try {
    const invite = inviteCodes.get(req.params.inviteCode);
    if (!invite || invite.expiresAt < new Date()) {
      return res.status(404).json({ error: 'Invitación inválida o expirada' });
    }

    const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
    if (!player) {
      return res.status(404).json({ error: 'Perfil de jugador no encontrado' });
    }

    // Same validation as addPlayerToTeam
    const medicalClearance = await prisma.medicalClearance.findFirst({
      where: { playerId: player.id, isActive: true, expiresAt: { gte: new Date() } },
    });
    if (!medicalClearance) {
      return res.status(400).json({ error: 'Necesita ficha médica vigente para unirse' });
    }

    const existingTeam = await prisma.teamPlayer.findFirst({
      where: { playerId: player.id, isActive: true, team: { tenantId: invite.tenantId } },
    });
    if (existingTeam) {
      return res.status(409).json({ error: 'Ya está fichado en un equipo de esta liga' });
    }

    const teamPlayer = await prisma.teamPlayer.create({
      data: { teamId: invite.teamId, playerId: player.id },
    });

    inviteCodes.delete(req.params.inviteCode);
    res.status(201).json({ message: 'Te uniste al equipo exitosamente', teamPlayer });
  } catch (error) {
    console.error('JoinTeamByInvite error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function registerTeamInTournament(req: AuthRequest, res: Response) {
  try {
    const { tournamentId, teamId } = req.params;

    const existing = await prisma.tournamentTeam.findFirst({
      where: { tournamentId, teamId },
    });
    if (existing) {
      return res.status(409).json({ error: 'Equipo ya registrado en este torneo' });
    }

    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, tenantId: req.tenantId! },
    });
    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (tournament.maxTeams) {
      const count = await prisma.tournamentTeam.count({ where: { tournamentId } });
      if (count >= tournament.maxTeams) {
        return res.status(400).json({ error: 'Torneo completo: máximo de equipos alcanzado' });
      }
    }

    const tt = await prisma.tournamentTeam.create({
      data: { tournamentId, teamId },
    });

    res.status(201).json({ message: 'Equipo inscrito en el torneo', tournamentTeam: tt });
  } catch (error) {
    console.error('RegisterTeamInTournament error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createVenue(req: AuthRequest, res: Response) {
  try {
    const { name, address, slots } = req.body;

    const venue = await prisma.venue.create({
      data: {
        tenantId: req.tenantId!,
        name,
        address,
        slots: slots
          ? { create: slots.map((s: any) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) }
          : undefined,
      },
      include: { slots: true },
    });

    res.status(201).json(venue);
  } catch (error) {
    console.error('CreateVenue error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listVenues(req: AuthRequest, res: Response) {
  try {
    const venues = await prisma.venue.findMany({
      where: { tenantId: req.tenantId! },
      include: { slots: true },
    });
    res.json(venues);
  } catch (error) {
    console.error('ListVenues error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateVenue(req: AuthRequest, res: Response) {
  try {
    const { name, address, slots } = req.body;

    const venue = await prisma.venue.update({
      where: { id: req.params.id },
      data: { name, address },
    });

    if (slots) {
      await prisma.venueSlot.deleteMany({ where: { venueId: venue.id } });
      await prisma.venueSlot.createMany({
        data: slots.map((s: any) => ({ venueId: venue.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })),
      });
    }

    const updated = await prisma.venue.findUnique({ where: { id: venue.id }, include: { slots: true } });
    res.json(updated);
  } catch (error) {
    console.error('UpdateVenue error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
