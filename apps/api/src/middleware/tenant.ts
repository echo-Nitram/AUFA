import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth';

/**
 * Resolves the tenant from the custom domain, the subdomain, or an explicit
 * X-Tenant-ID header.
 *
 * The header is a convenience for API clients and for the web app while it runs
 * on a single origin, so it cannot be trusted on its own: anyone can send any
 * id. It only selects which tenant the request talks about. Permission to act
 * on that tenant is granted by requireTenantMember / requireTenantAdmin, which
 * check membership against the resolved id. Routes that skip those checks must
 * expose nothing beyond what the public league portal already shows.
 */
export async function resolveTenant(req: AuthRequest, res: Response, next: NextFunction) {
  const host = req.hostname;

  let tenant = await prisma.tenant.findFirst({
    where: { customDomain: host, isActive: true },
    select: { id: true },
  });

  if (!tenant) {
    // "ligauniversitaria.aufa.uy" -> "ligauniversitaria"
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && host.includes('.')) {
      tenant = await prisma.tenant.findFirst({
        where: { subdomain, isActive: true },
        select: { id: true },
      });
    }
  }

  if (tenant) {
    req.tenantId = tenant.id;
    req.tenantVerifiedByHost = true;
    return next();
  }

  const tenantHeader = req.headers['x-tenant-id'];
  if (typeof tenantHeader === 'string' && tenantHeader.length > 0) {
    const fromHeader = await prisma.tenant.findFirst({
      where: { id: tenantHeader, isActive: true },
      select: { id: true },
    });
    if (fromHeader) {
      req.tenantId = fromHeader.id;
      req.tenantVerifiedByHost = false;
    }
  }

  next();
}

/**
 * Selects the tenant named by a path parameter, for routes addressed as
 * /tenants/:id rather than by host. Pair it with requireTenantAdmin.
 */
export function tenantFromParam(param = 'id') {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    req.tenantId = req.params[param];
    req.tenantVerifiedByHost = false;
    next();
  };
}

/**
 * Requires a tenant to be resolved. Says nothing about who may act on it.
 */
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'No se pudo resolver la liga. Verifique el subdominio o dominio.' });
  }
  next();
}

async function membership(tenantId: string, userId: string, adminOnly: boolean) {
  return prisma.tenantMember.findFirst({
    where: {
      tenantId,
      userId,
      isActive: true,
      ...(adminOnly && { role: 'ADMIN' }),
    },
    select: { id: true },
  });
}

/**
 * Requires the authenticated user to belong to the resolved tenant in any role.
 * Use on every authenticated route that reads or writes league-private data.
 */
export async function requireTenantMember(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.tenantId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  if (!(await membership(req.tenantId, req.user.userId, false))) {
    return res.status(403).json({ error: 'No pertenece a esta liga' });
  }

  next();
}

/**
 * Requires the authenticated user to be an admin of the resolved tenant.
 */
export async function requireTenantAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.tenantId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  if (!(await membership(req.tenantId, req.user.userId, true))) {
    return res.status(403).json({ error: 'No es administrador de esta liga' });
  }

  next();
}
