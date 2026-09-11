import { Router } from 'express';
import * as tenantController from './tenant.controller';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin, tenantFromParam } from '../../middleware/tenant';

const router = Router();

// Super-Admin: manage tenants
router.post('/', authenticate, requireSuperAdmin, tenantController.createTenant);
router.get('/', authenticate, requireSuperAdmin, tenantController.listTenants);
router.get('/:id', authenticate, tenantFromParam(), requireTenantAdmin, tenantController.getTenant);
router.put('/:id', authenticate, requireSuperAdmin, tenantController.updateTenant);
router.put('/:id/branding', authenticate, tenantFromParam(), requireTenantAdmin, tenantController.updateBranding);

// Self-service: create league (no auth required - creates account + tenant)
router.post('/create', tenantController.createTenantSelfService);

// Public: resolve tenant by slug (no auth)
router.get('/public/:slug', tenantController.getPublicTenant);

// Public: resolve tenant info for frontend (needs X-Tenant-ID header)
router.get('/resolve/current', resolveTenant, requireTenant, tenantController.getCurrentTenant);

// Admin panel: settings & branding
router.get('/admin/settings', authenticate, resolveTenant, requireTenant, requireTenantAdmin, tenantController.getAdminSettings);
router.put('/admin/settings', authenticate, resolveTenant, requireTenant, requireTenantAdmin, tenantController.updateAdminSettings);

// Admin panel: manage members
router.get('/admin/members', authenticate, resolveTenant, requireTenant, requireTenantAdmin, tenantController.listMembers);
router.post('/admin/members', authenticate, resolveTenant, requireTenant, requireTenantAdmin, tenantController.addMember);
router.put('/admin/members/:memberId', authenticate, resolveTenant, requireTenant, requireTenantAdmin, tenantController.updateMemberRole);
router.delete('/admin/members/:memberId', authenticate, resolveTenant, requireTenant, requireTenantAdmin, tenantController.removeMember);

export default router;
