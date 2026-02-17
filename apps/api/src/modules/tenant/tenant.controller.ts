import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['BARRIO', 'LIGA_PRO', 'ENTERPRISE']),
  adminEmail: z.string().email(),
  adminFullName: z.string().min(2),
  adminPassword: z.string().min(6),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export async function createTenant(req: Request, res: Response) {
  try {
    const data = createTenantSchema.parse(req.body);

    // Check slug uniqueness
    const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return res.status(409).json({ error: 'El slug ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 12);

    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          subdomain: data.slug,
          plan: data.plan,
          primaryColor: data.primaryColor || '#1a56db',
          secondaryColor: data.secondaryColor || '#1e3a5f',
          accentColor: data.accentColor || '#f59e0b',
        },
      });

      // Create or find admin user
      let adminUser = await tx.user.findUnique({ where: { email: data.adminEmail } });
      if (!adminUser) {
        adminUser = await tx.user.create({
          data: {
            email: data.adminEmail,
            passwordHash,
            role: 'PLAYER', // Global role stays PLAYER; tenant role is ADMIN
          },
        });
      }

      // Create tenant membership
      await tx.tenantMember.create({
        data: {
          tenantId: newTenant.id,
          userId: adminUser.id,
          role: 'ADMIN',
        },
      });

      return newTenant;
    });

    res.status(201).json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('CreateTenant error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listTenants(_req: Request, res: Response) {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { _count: { select: { tournaments: true, teams: true, members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tenants);
  } catch (error) {
    console.error('ListTenants error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getTenant(req: Request, res: Response) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, email: true } } } },
        _count: { select: { tournaments: true, teams: true } },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Liga no encontrada' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('GetTenant error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateTenant(req: Request, res: Response) {
  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(tenant);
  } catch (error) {
    console.error('UpdateTenant error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateBranding(req: AuthRequest, res: Response) {
  try {
    const { logoUrl, bannerUrl, primaryColor, secondaryColor, accentColor, backgroundColor, textColor } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...(logoUrl !== undefined && { logoUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(backgroundColor !== undefined && { backgroundColor }),
        ...(textColor !== undefined && { textColor }),
      },
    });

    res.json(tenant);
  } catch (error) {
    console.error('UpdateBranding error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listMembers(req: AuthRequest, res: Response) {
  try {
    const members = await prisma.tenantMember.findMany({
      where: { tenantId: req.tenantId! },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(members);
  } catch (error) {
    console.error('ListMembers error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function addMember(req: AuthRequest, res: Response) {
  try {
    const { email, role } = req.body as { email: string; role: 'ADMIN' | 'OPERATOR' };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No existe un usuario con ese email' });
    }

    const existing = await prisma.tenantMember.findFirst({
      where: { tenantId: req.tenantId!, userId: user.id },
    });
    if (existing) {
      return res.status(409).json({ error: 'El usuario ya es miembro de esta liga' });
    }

    const member = await prisma.tenantMember.create({
      data: {
        tenantId: req.tenantId!,
        userId: user.id,
        role: role || 'OPERATOR',
      },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('AddMember error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateMemberRole(req: AuthRequest, res: Response) {
  try {
    const { role } = req.body as { role: 'ADMIN' | 'OPERATOR' };

    const member = await prisma.tenantMember.findFirst({
      where: { id: req.params.memberId, tenantId: req.tenantId! },
    });
    if (!member) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    const updated = await prisma.tenantMember.update({
      where: { id: member.id },
      data: { role },
      include: { user: { select: { id: true, email: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error('UpdateMemberRole error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function removeMember(req: AuthRequest, res: Response) {
  try {
    const member = await prisma.tenantMember.findFirst({
      where: { id: req.params.memberId, tenantId: req.tenantId! },
    });
    if (!member) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    // Don't allow removing yourself
    if (member.userId === req.user!.userId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    await prisma.tenantMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });

    res.json({ message: 'Miembro eliminado' });
  } catch (error) {
    console.error('RemoveMember error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getAdminSettings(req: AuthRequest, res: Response) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId! },
      select: {
        id: true, name: true, slug: true, subdomain: true, plan: true,
        logoUrl: true, bannerUrl: true,
        primaryColor: true, secondaryColor: true, accentColor: true,
        backgroundColor: true, textColor: true,
        commissionRate: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Liga no encontrada' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('GetAdminSettings error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateAdminSettings(req: AuthRequest, res: Response) {
  try {
    const { name, primaryColor, secondaryColor, accentColor, backgroundColor, textColor, logoUrl, bannerUrl } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId! },
      data: {
        ...(name && { name }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(accentColor && { accentColor }),
        ...(backgroundColor && { backgroundColor }),
        ...(textColor && { textColor }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
      },
    });

    res.json(tenant);
  } catch (error) {
    console.error('UpdateAdminSettings error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Self-service: any authenticated or new user can create a league.
 * Creates tenant + user (if new) + membership as ADMIN.
 */
export async function createTenantSelfService(req: Request, res: Response) {
  try {
    const schema = z.object({
      leagueName: z.string().min(2).max(100),
      slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minusculas, numeros y guiones'),
      plan: z.enum(['BARRIO', 'LIGA_PRO', 'ENTERPRISE']).default('BARRIO'),
      // Admin account
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
    });

    const data = schema.parse(req.body);

    // Check slug
    const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return res.status(409).json({ error: 'Ese slug ya esta en uso. Elige otro.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.leagueName,
          slug: data.slug,
          subdomain: data.slug,
          plan: data.plan,
          primaryColor: '#1a56db',
          secondaryColor: '#1e3a5f',
          accentColor: '#f59e0b',
        },
      });

      // Find or create user
      let user = await tx.user.findUnique({ where: { email: data.email } });
      if (!user) {
        user = await tx.user.create({
          data: { email: data.email, passwordHash, role: 'PLAYER' },
        });
        // Also create player record so they have full AUFA ID
        await tx.player.create({
          data: { userId: user.id, fullName: data.fullName, ci: `ORG-${Date.now()}` },
        });
      } else {
        // Verify password for existing user
        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid) {
          throw new Error('INVALID_PASSWORD');
        }
      }

      // Make user admin of this tenant
      await tx.tenantMember.create({
        data: { tenantId: tenant.id, userId: user.id, role: 'ADMIN' },
      });

      return { tenant, userId: user.id, email: user.email };
    });

    res.status(201).json({
      message: 'Liga creada exitosamente',
      tenant: result.tenant,
      tenantId: result.tenant.id,
      slug: result.tenant.slug,
    });
  } catch (error: any) {
    if (error?.message === 'INVALID_PASSWORD') {
      return res.status(401).json({ error: 'El email ya existe y la contrasena no coincide' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos invalidos', details: error.errors });
    }
    console.error('CreateTenantSelfService error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getPublicTenant(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        bannerUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Liga no encontrada' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('GetPublicTenant error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getCurrentTenant(req: AuthRequest, res: Response) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        plan: true,
        logoUrl: true,
        bannerUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        backgroundColor: true,
        textColor: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Liga no encontrada' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('GetCurrentTenant error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
