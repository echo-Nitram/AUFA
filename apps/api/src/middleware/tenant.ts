import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth';

/**
 * Multi-tenant middleware: resolves tenant from subdomain or custom domain.
 * Sets req.tenantId for downstream use.
 */
export async function resolveTenant(req: AuthRequest, res: Response, next: NextFunction) {
  // Try to resolve from X-Tenant-ID header (for API clients)
  const tenantHeader = req.headers['x-tenant-id'] as string;
  if (tenantHeader) {
    req.tenantId = tenantHeader;
    return next();
  }

  // Try to resolve from subdomain
  const host = req.hostname;

  // Check custom domain first
  let tenant = await prisma.tenant.findFirst({
    where: { customDomain: host, isActive: true },
    select: { id: true },
  });

  if (!tenant) {
    // Extract subdomain: "ligauniversitaria.aufa.uy" -> "ligauniversitaria"
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenant = await prisma.tenant.findFirst({
        where: { subdomain, isActive: true },
        select: { id: true },
      });
    }
  }

  if (tenant) {
    req.tenantId = tenant.id;
  }

  next();
}

/**
 * Requires a tenant to be resolved. Returns 400 if no tenant found.
 */
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'No se pudo resolver la liga. Verifique el subdominio o dominio.' });
  }
  next();
}

/**
 * Requires the authenticated user to be an admin or operator of the resolved tenant.
 */
export async function requireTenantAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.tenantId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  // Super admin can access any tenant
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const membership = await prisma.tenantMember.findFirst({
    where: {
      tenantId: req.tenantId,
      userId: req.user.userId,
      role: 'ADMIN',
      isActive: true,
    },
  });

  if (!membership) {
    return res.status(403).json({ error: 'No es administrador de esta liga' });
  }

  next();
}
