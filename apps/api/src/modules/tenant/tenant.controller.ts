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
