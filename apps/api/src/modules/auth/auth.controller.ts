import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AuthRequest } from '../../middleware/auth';

const registerSchema = z.object({
  ci: z.string().min(6).max(12),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d))),
});

const loginSchema = z.object({
  identifier: z.string().min(1), // CI or email
  password: z.string(),
});

function generateTokens(payload: { userId: string; email: string; role: string }) {
  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as string,
  });
  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as string,
  });
  return { accessToken, refreshToken };
}

/**
 * CI lookup: checks if a player already exists in AUFA.
 * Step 1 of the login/register flow.
 */
export async function lookupCI(req: Request, res: Response) {
  try {
    const { ci } = req.params;

    const player = await prisma.player.findUnique({
      where: { ci },
      include: {
        user: { select: { email: true } },
        medicalClearances: {
          where: { isActive: true, expiresAt: { gte: new Date() } },
          take: 1,
          select: { expiresAt: true },
        },
      },
    });

    if (!player) {
      return res.json({ exists: false });
    }

    const email = player.user.email;
    const [local, domain] = email.split('@');
    const maskedEmail = local[0] + '***' + local[local.length - 1] + '@' + domain;

    res.json({
      exists: true,
      fullName: player.fullName,
      photoUrl: player.photoUrl,
      maskedEmail,
      hasMedicalClearance: player.medicalClearances.length > 0,
    });
  } catch (error) {
    console.error('LookupCI error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function registerPlayer(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);

    const existingPlayer = await prisma.player.findUnique({ where: { ci: data.ci } });
    if (existingPlayer) {
      return res.status(409).json({ error: 'Ya existe un jugador registrado con esta CI' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(409).json({ error: 'El email ya esta registrado' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'PLAYER',
        player: {
          create: {
            ci: data.ci,
            fullName: data.fullName,
            phone: data.phone,
            dateOfBirth: new Date(data.dateOfBirth),
          },
        },
      },
      include: { player: true },
    });

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.player!.fullName,
        role: user.role,
        aufaId: user.player!.aufaId,
        ci: user.player!.ci,
        playerId: user.player!.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos invalidos', details: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Login by CI or email + password.
 */
export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);

    const isEmail = data.identifier.includes('@');
    let user: any;

    if (isEmail) {
      user = await prisma.user.findUnique({
        where: { email: data.identifier },
        include: { player: true },
      });
    } else {
      const player = await prisma.player.findUnique({
        where: { ci: data.identifier },
        include: { user: true },
      });
      if (player) {
        user = { ...player.user, player };
      }
    }

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.player?.fullName || user.email,
        role: user.role,
        aufaId: user.player?.aufaId,
        ci: user.player?.ci,
        playerId: user.player?.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos invalidos', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as {
      userId: string;
      email: string;
      role: string;
    };

    const tokens = generateTokens({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Refresh token invalido' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        player: {
          include: {
            medicalClearances: { where: { isActive: true }, orderBy: { expiresAt: 'desc' }, take: 1 },
            teamPlayers: {
              where: { isActive: true },
              include: { team: { include: { tenant: { select: { id: true, name: true, slug: true } } } } },
            },
          },
        },
        tenantMembers: { include: { tenant: { select: { id: true, name: true, slug: true } } } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Build tenants list from memberships
    const tenants = user.tenantMembers.map((m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      role: m.role,
    }));

    // Also include tenants from team memberships (for players without admin roles)
    if (user.player?.teamPlayers) {
      const existingTenantIds = new Set(tenants.map((t) => t.tenantId));
      for (const tp of user.player.teamPlayers) {
        if (!existingTenantIds.has(tp.team.tenantId)) {
          tenants.push({
            tenantId: tp.team.tenantId,
            tenantName: tp.team.tenant.name,
            tenantSlug: tp.team.tenant.slug,
            role: 'PLAYER',
          });
          existingTenantIds.add(tp.team.tenantId);
        }
      }
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      player: user.player,
      playerId: user.player?.id || null,
      tenants,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Request password reset - generates a token (stored in-memory for simplicity)
 */
const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.json({ message: 'Si el email existe, recibiras instrucciones para resetear tu contrasena.' });
    }

    // Generate reset token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }); // 1 hour

    // In production, send email. For now, log it.
    console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);
    console.log(`[PASSWORD RESET] URL: ${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${token}`);

    res.json({
      message: 'Si el email existe, recibiras instrucciones para resetear tu contrasena.',
      // DEV ONLY: include token so it can be used without email
      ...(env.nodeEnv !== 'production' && { devToken: token }),
    });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y contrasena requeridos' });
    if (password.length < 6) return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });

    const resetData = resetTokens.get(token);
    if (!resetData || resetData.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token invalido o expirado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: resetData.userId },
      data: { passwordHash },
    });

    resetTokens.delete(token);

    res.json({ message: 'Contrasena actualizada exitosamente' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const { phone, photoUrl } = req.body;

    const player = await prisma.player.update({
      where: { userId: req.user!.userId },
      data: {
        ...(phone !== undefined && { phone }),
        ...(photoUrl !== undefined && { photoUrl }),
      },
    });

    res.json(player);
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
