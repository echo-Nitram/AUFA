import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export async function listAvailableReferees(req: Request, res: Response) {
  try {
    const { dayOfWeek, time } = req.query;

    const referees = await prisma.referee.findMany({
      where: {
        isAvailable: true,
        ...(dayOfWeek !== undefined && {
          availability: {
            some: { dayOfWeek: parseInt(dayOfWeek as string) },
          },
        }),
      },
      include: {
        availability: true,
        user: { select: { email: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json(referees);
  } catch (error) {
    console.error('ListAvailableReferees error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getRefereeProfile(req: Request, res: Response) {
  try {
    const referee = await prisma.referee.findUnique({
      where: { id: req.params.id },
      include: {
        availability: true,
        matches: {
          where: { status: 'COMPLETED' },
          select: { id: true, scheduledAt: true, homeScore: true, awayScore: true },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!referee) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }

    res.json({
      ...referee,
      totalMatchesOfficiated: await prisma.match.count({
        where: { refereeId: referee.id, status: 'COMPLETED' },
      }),
    });
  } catch (error) {
    console.error('GetRefereeProfile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function registerAsReferee(req: AuthRequest, res: Response) {
  try {
    const { fullName, phone, bio, certifications } = req.body;

    const existing = await prisma.referee.findUnique({ where: { userId: req.user!.userId } });
    if (existing) {
      return res.status(409).json({ error: 'Ya está registrado como árbitro' });
    }

    // Update user role
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: 'REFEREE' },
    });

    const referee = await prisma.referee.create({
      data: {
        userId: req.user!.userId,
        fullName,
        phone,
        bio,
        certifications: certifications || [],
      },
    });

    res.status(201).json({ message: 'Registrado como árbitro exitosamente', referee });
  } catch (error) {
    console.error('RegisterAsReferee error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateRefereeProfile(req: AuthRequest, res: Response) {
  try {
    const { fullName, phone, bio, certifications, photoUrl, isAvailable } = req.body;

    const referee = await prisma.referee.update({
      where: { userId: req.user!.userId },
      data: {
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(certifications && { certifications }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });

    res.json(referee);
  } catch (error) {
    console.error('UpdateRefereeProfile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const availabilitySchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}));

export async function updateAvailability(req: AuthRequest, res: Response) {
  try {
    const slots = availabilitySchema.parse(req.body.slots);

    const referee = await prisma.referee.findUnique({ where: { userId: req.user!.userId } });
    if (!referee) {
      return res.status(404).json({ error: 'Perfil de árbitro no encontrado' });
    }

    // Replace all slots
    await prisma.refereeAvailability.deleteMany({ where: { refereeId: referee.id } });
    await prisma.refereeAvailability.createMany({
      data: slots.map((s) => ({ refereeId: referee.id, ...s })),
    });

    const updated = await prisma.referee.findUnique({
      where: { id: referee.id },
      include: { availability: true },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('UpdateAvailability error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function hireReferee(req: AuthRequest, res: Response) {
  try {
    const { refereeId, matchIds } = req.body as { refereeId: string; matchIds: string[] };

    const referee = await prisma.referee.findUnique({ where: { id: refereeId } });
    if (!referee) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }

    const updated = await Promise.all(
      matchIds.map((matchId) =>
        prisma.match.update({
          where: { id: matchId },
          data: { refereeId },
        })
      )
    );

    res.json({
      message: `Árbitro ${referee.fullName} asignado a ${updated.length} partido(s)`,
      matches: updated.map((m) => m.id),
    });
  } catch (error) {
    console.error('HireReferee error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Admin registers a new referee by providing email + name.
 * Creates user if doesn't exist, creates referee record.
 */
export async function registerRefereeByAdmin(req: AuthRequest, res: Response) {
  try {
    const { email, fullName, phone, certifications } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find or create user
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        const passwordHash = await bcrypt.hash('referee123', 12);
        user = await tx.user.create({
          data: { email, passwordHash, role: 'REFEREE' },
        });
      } else {
        // Update role if not already referee
        if (user.role !== 'REFEREE') {
          await tx.user.update({ where: { id: user.id }, data: { role: 'REFEREE' } });
        }
      }

      // Check if already a referee
      const existing = await tx.referee.findUnique({ where: { userId: user.id } });
      if (existing) {
        return { referee: existing, created: false };
      }

      const referee = await tx.referee.create({
        data: {
          userId: user.id,
          fullName,
          phone: phone || null,
          certifications: certifications || [],
        },
      });

      return { referee, created: true };
    });

    res.status(result.created ? 201 : 200).json({
      message: result.created
        ? `Arbitro ${fullName} registrado. Contrasena temporal: referee123`
        : `${fullName} ya estaba registrado como arbitro`,
      referee: result.referee,
    });
  } catch (error) {
    console.error('RegisterRefereeByAdmin error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
