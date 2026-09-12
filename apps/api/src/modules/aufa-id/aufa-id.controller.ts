import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

/** True when the player is registered in a team of the given league. */
async function isPlayerInTenant(playerId: string, tenantId: string) {
  const membership = await prisma.teamPlayer.findFirst({
    where: { playerId, isActive: true, team: { tenantId } },
    select: { id: true },
  });
  return Boolean(membership);
}

/** True when the requester is the player, a super-admin, or an admin of a league the player plays in. */
async function mayReadPlayerRecord(req: AuthRequest, playerId: string) {
  if (req.user!.role === 'SUPER_ADMIN') return true;

  const self = await prisma.player.findFirst({
    where: { id: playerId, userId: req.user!.userId },
    select: { id: true },
  });
  if (self) return true;

  const admin = await prisma.tenantMember.findFirst({
    where: {
      userId: req.user!.userId,
      role: 'ADMIN',
      isActive: true,
      tenant: {
        teams: { some: { teamPlayers: { some: { playerId, isActive: true } } } },
      },
    },
    select: { id: true },
  });
  return Boolean(admin);
}

/**
 * Lookup player by CI - used during registration/fichaje flow.
 * If player exists, returns basic info. If not, returns 404.
 */
export async function lookupByCI(req: Request, res: Response) {
  try {
    const player = await prisma.player.findUnique({
      where: { ci: req.params.ci },
      select: {
        id: true,
        aufaId: true,
        fullName: true,
        photoUrl: true,
        identityStatus: true,
        medicalClearances: {
          where: { isActive: true, expiresAt: { gte: new Date() } },
          orderBy: { expiresAt: 'desc' },
          take: 1,
          select: { expiresAt: true, isActive: true },
        },
      },
    });

    if (!player) {
      return res.status(404).json({ exists: false, message: 'Jugador no registrado en AUFA' });
    }

    res.json({
      exists: true,
      player: {
        ...player,
        hasMedicalClearance: player.medicalClearances.length > 0,
        medicalExpiresAt: player.medicalClearances[0]?.expiresAt || null,
      },
    });
  } catch (error) {
    console.error('LookupByCI error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Upload identity documents (CI front, CI back, selfie).
 */
export async function uploadIdentityDocs(req: AuthRequest, res: Response) {
  try {
    const { ciPhotoFrontUrl, ciPhotoBackUrl, selfieUrl } = req.body;

    const player = await prisma.player.update({
      where: { userId: req.user!.userId },
      data: {
        ciPhotoFrontUrl,
        ciPhotoBackUrl,
        selfieUrl,
        identityStatus: 'PENDING',
      },
    });

    res.json({ message: 'Documentos cargados. Pendiente de validación por el organizador.', player });
  } catch (error) {
    console.error('UploadIdentityDocs error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Upload medical clearance document.
 */
export async function uploadMedicalClearance(req: AuthRequest, res: Response) {
  try {
    const { documentUrl, issuedAt, expiresAt } = req.body;

    // Deactivate previous clearances
    const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
    if (!player) {
      return res.status(404).json({ error: 'Perfil de jugador no encontrado' });
    }

    await prisma.medicalClearance.updateMany({
      where: { playerId: player.id, isActive: true },
      data: { isActive: false },
    });

    const clearance = await prisma.medicalClearance.create({
      data: {
        playerId: player.id,
        documentUrl,
        issuedAt: new Date(issuedAt),
        expiresAt: new Date(expiresAt),
        isActive: true,
      },
    });

    res.status(201).json({ message: 'Ficha médica cargada exitosamente.', clearance });
  } catch (error) {
    console.error('UploadMedicalClearance error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Get player passport with career stats across all leagues.
 */
export async function getPassport(req: Request, res: Response) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.playerId },
      include: {
        medicalClearances: {
          where: { isActive: true },
          orderBy: { expiresAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Aggregate stats across all leagues
    const [goalCount, assistCount, yellowCount, redCount, matchCount] = await Promise.all([
      prisma.goal.count({ where: { playerId: player.id } }),
      prisma.goal.count({ where: { assistPlayerId: player.id } }),
      prisma.card.count({ where: { playerId: player.id, type: 'YELLOW' } }),
      prisma.card.count({ where: { playerId: player.id, type: 'RED' } }),
      prisma.matchLineup.count({ where: { playerId: player.id } }),
    ]);

    // Get per-league breakdown
    const teamMemberships = await prisma.teamPlayer.findMany({
      where: { playerId: player.id },
      include: {
        team: {
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const leagues = [...new Map(teamMemberships.map((tp) => [tp.team.tenantId, tp.team.tenant])).values()];

    res.json({
      aufaId: player.aufaId,
      fullName: player.fullName,
      photoUrl: player.photoUrl,
      identityStatus: player.identityStatus,
      medicalClearance: player.medicalClearances[0] || null,
      career: {
        totalMatches: matchCount,
        totalGoals: goalCount,
        totalAssists: assistCount,
        totalYellowCards: yellowCount,
        totalRedCards: redCount,
      },
      leagues: leagues.map((l) => ({ id: l.id, name: l.name, slug: l.slug })),
    });
  } catch (error) {
    console.error('GetPassport error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Players of this league waiting for their identity to be reviewed.
 *
 * Only players registered in a team of this league appear: validating an AUFA ID
 * is trusted by every other league, so it belongs to an organizer the player
 * actually plays for.
 */
export async function listPendingIdentities(req: AuthRequest, res: Response) {
  try {
    const players = await prisma.player.findMany({
      where: {
        identityStatus: 'PENDING',
        // Nothing to review until the documents are uploaded.
        ciPhotoFrontUrl: { not: null },
        teamPlayers: { some: { isActive: true, team: { tenantId: req.tenantId! } } },
      },
      select: {
        id: true,
        aufaId: true,
        fullName: true,
        ci: true,
        dateOfBirth: true,
        ciPhotoFrontUrl: true,
        ciPhotoBackUrl: true,
        selfieUrl: true,
        updatedAt: true,
        teamPlayers: {
          where: { isActive: true, team: { tenantId: req.tenantId! } },
          select: { team: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    res.json(
      players.map((p) => ({
        playerId: p.id,
        aufaId: p.aufaId,
        fullName: p.fullName,
        ci: p.ci,
        dateOfBirth: p.dateOfBirth,
        teamName: p.teamPlayers[0]?.team.name ?? null,
        ciPhotoFrontUrl: p.ciPhotoFrontUrl,
        ciPhotoBackUrl: p.ciPhotoBackUrl,
        selfieUrl: p.selfieUrl,
        submittedAt: p.updatedAt,
      }))
    );
  } catch (error) {
    console.error('ListPendingIdentities error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * League admin validates a player's identity.
 */
export async function validateIdentity(req: AuthRequest, res: Response) {
  try {
    const { status, reason } = req.body; // status: APPROVED | REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Estado debe ser APPROVED o REJECTED' });
    }

    // AUFA ID is national, so an approval here is trusted by every other league.
    // Only an organizer the player actually plays for may grant it.
    if (!(await isPlayerInTenant(req.params.playerId, req.tenantId!))) {
      return res.status(403).json({ error: 'El jugador no esta fichado en esta liga' });
    }

    const player = await prisma.player.update({
      where: { id: req.params.playerId },
      data: {
        identityStatus: status,
        identityValidatedBy: req.user!.userId,
        identityValidatedAt: new Date(),
      },
    });

    res.json({ message: `Identidad ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`, player });
  } catch (error) {
    console.error('ValidateIdentity error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Check medical clearance status for a player.
 */
export async function getMedicalStatus(req: AuthRequest, res: Response) {
  try {
    if (!(await mayReadPlayerRecord(req, req.params.playerId))) {
      return res.status(403).json({ error: 'No puede consultar la ficha medica de este jugador' });
    }

    const clearance = await prisma.medicalClearance.findFirst({
      where: { playerId: req.params.playerId, isActive: true },
      orderBy: { expiresAt: 'desc' },
    });

    if (!clearance) {
      return res.json({ hasClearance: false, message: 'Sin ficha médica vigente' });
    }

    const isExpired = new Date(clearance.expiresAt) < new Date();
    const daysUntilExpiry = Math.ceil(
      (new Date(clearance.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      hasClearance: !isExpired,
      isExpired,
      expiresAt: clearance.expiresAt,
      daysUntilExpiry: isExpired ? 0 : daysUntilExpiry,
      isAboutToExpire: daysUntilExpiry > 0 && daysUntilExpiry <= 30,
    });
  } catch (error) {
    console.error('GetMedicalStatus error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
