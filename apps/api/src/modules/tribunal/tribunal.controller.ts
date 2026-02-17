import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export async function listSanctions(req: AuthRequest, res: Response) {
  try {
    const { status, playerId, isActive } = req.query;

    const sanctions = await prisma.sanction.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(status && { status: status as any }),
        ...(playerId && { playerId: playerId as string }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      include: {
        player: { select: { id: true, aufaId: true, fullName: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sanctions);
  } catch (error) {
    console.error('ListSanctions error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getPendingCases(req: AuthRequest, res: Response) {
  try {
    const pendingCases = await prisma.sanction.findMany({
      where: {
        tenantId: req.tenantId!,
        status: 'PENDING_TRIBUNAL',
      },
      include: {
        player: { select: { id: true, aufaId: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(pendingCases);
  } catch (error) {
    console.error('GetPendingCases error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const resolveSanctionSchema = z.object({
  matchesSuspended: z.number().int().min(0),
  tribunalNotes: z.string().optional(),
});

export async function resolveSanction(req: AuthRequest, res: Response) {
  try {
    const data = resolveSanctionSchema.parse(req.body);

    const sanction = await prisma.sanction.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });

    if (!sanction) {
      return res.status(404).json({ error: 'Sanción no encontrada' });
    }

    if (sanction.status === 'RESOLVED') {
      return res.status(400).json({ error: 'Esta sanción ya fue resuelta' });
    }

    const updated = await prisma.sanction.update({
      where: { id: sanction.id },
      data: {
        status: 'RESOLVED',
        matchesSuspended: data.matchesSuspended,
        tribunalNotes: data.tribunalNotes,
        resolvedBy: req.user!.userId,
        resolvedAt: new Date(),
        isActive: data.matchesSuspended > 0,
      },
      include: {
        player: { select: { fullName: true } },
      },
    });

    res.json({
      message: data.matchesSuspended > 0
        ? `${updated.player.fullName} suspendido por ${data.matchesSuspended} fecha(s)`
        : `${updated.player.fullName} absuelto por el tribunal`,
      sanction: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('ResolveSanction error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Check if a player is eligible to play in this league.
 * Checks: active sanctions, medical clearance, identity validation.
 */
export async function checkEligibility(req: AuthRequest, res: Response) {
  try {
    const { playerId } = req.params;

    const player = await prisma.player.findUnique({
      where: { id: playerId },
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

    // Check active sanctions in this league
    const activeSanctions = await prisma.sanction.findMany({
      where: {
        playerId,
        tenantId: req.tenantId!,
        isActive: true,
      },
    });

    const pendingSanction = activeSanctions.find((s) => s.matchesServed < s.matchesSuspended);

    const hasMedical = player.medicalClearances.length > 0 &&
      new Date(player.medicalClearances[0].expiresAt) >= new Date();

    const isIdentityApproved = player.identityStatus === 'APPROVED';

    const eligible = !pendingSanction && hasMedical && isIdentityApproved;

    const reasons: string[] = [];
    if (pendingSanction) {
      reasons.push(`Sancionado: ${pendingSanction.matchesSuspended - pendingSanction.matchesServed} fecha(s) restante(s) - ${pendingSanction.reason}`);
    }
    if (!hasMedical) {
      reasons.push('Sin ficha médica vigente');
    }
    if (!isIdentityApproved) {
      reasons.push(`Identidad: ${player.identityStatus}`);
    }

    res.json({
      playerId,
      playerName: player.fullName,
      eligible,
      reasons: eligible ? [] : reasons,
    });
  } catch (error) {
    console.error('CheckEligibility error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * After a matchday is completed, serve one match for all active sanctions.
 */
export async function serveMatchday(req: AuthRequest, res: Response) {
  try {
    const activeSanctions = await prisma.sanction.findMany({
      where: {
        tenantId: req.tenantId!,
        isActive: true,
      },
      include: { player: { select: { fullName: true } } },
    });

    const updates = [];
    for (const sanction of activeSanctions) {
      if (sanction.matchesServed < sanction.matchesSuspended) {
        const newServed = sanction.matchesServed + 1;
        const isCompleted = newServed >= sanction.matchesSuspended;

        updates.push(
          prisma.sanction.update({
            where: { id: sanction.id },
            data: {
              matchesServed: newServed,
              isActive: !isCompleted,
            },
          })
        );
      }
    }

    await Promise.all(updates);

    res.json({
      message: `Fecha cumplida para ${updates.length} sanciones activas`,
      processed: updates.length,
    });
  } catch (error) {
    console.error('ServeMatchday error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
