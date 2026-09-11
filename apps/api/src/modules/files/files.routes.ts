import { Router, Response } from 'express';
import path from 'path';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { PRIVATE_CATEGORIES, isSafeFilename, uploadDir } from '../../config/upload';

const router = Router();

type DocumentOwner = { playerId: string; userId: string };

/**
 * Resolves which player a private document belongs to, by matching the stored
 * URL. A document nobody claims is treated as not found.
 */
async function findDocumentOwner(url: string): Promise<DocumentOwner | null> {
  const player = await prisma.player.findFirst({
    where: {
      OR: [{ ciPhotoFrontUrl: url }, { ciPhotoBackUrl: url }, { selfieUrl: url }],
    },
    select: { id: true, userId: true },
  });
  if (player) {
    return { playerId: player.id, userId: player.userId };
  }

  const clearance = await prisma.medicalClearance.findFirst({
    where: { documentUrl: url },
    select: { player: { select: { id: true, userId: true } } },
  });
  if (clearance) {
    return { playerId: clearance.player.id, userId: clearance.player.userId };
  }

  return null;
}

/**
 * A document may be read by its owner, by a platform super-admin, or by an admin
 * of a league the player is actually registered in — the organizer who has to
 * validate the identity by hand. Nobody else, including admins of other leagues.
 */
async function mayRead(req: AuthRequest, owner: DocumentOwner) {
  if (req.user!.userId === owner.userId) return true;
  if (req.user!.role === 'SUPER_ADMIN') return true;

  const adminOfPlayersLeague = await prisma.tenantMember.findFirst({
    where: {
      userId: req.user!.userId,
      role: 'ADMIN',
      isActive: true,
      tenant: {
        teams: {
          some: { teamPlayers: { some: { playerId: owner.playerId, isActive: true } } },
        },
      },
    },
    select: { id: true },
  });

  return Boolean(adminOfPlayersLeague);
}

router.get('/:category/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, filename } = req.params;

    if (!(PRIVATE_CATEGORIES as readonly string[]).includes(category)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    if (!isSafeFilename(filename)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const owner = await findDocumentOwner(`/api/files/${category}/${filename}`);
    if (!owner) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    if (!(await mayRead(req, owner))) {
      // Deliberately indistinguishable from a missing file: a 403 would confirm
      // that this exact document exists.
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path.join(uploadDir, category, filename));
  } catch (error) {
    console.error('GetPrivateFile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
