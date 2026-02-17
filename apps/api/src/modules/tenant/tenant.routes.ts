import { Router } from 'express';
import * as tenantController from './tenant.controller';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import { resolveTenant, requireTenant } from '../../middleware/tenant';

const router = Router();

// Super-Admin: manage tenants
router.post('/', authenticate, requireSuperAdmin, tenantController.createTenant);
router.get('/', authenticate, requireSuperAdmin, tenantController.listTenants);
router.get('/:id', authenticate, tenantController.getTenant);
router.put('/:id', authenticate, requireSuperAdmin, tenantController.updateTenant);
router.put('/:id/branding', authenticate, tenantController.updateBranding);

// Public: resolve tenant by slug (no auth)
router.get('/public/:slug', tenantController.getPublicTenant);

// Public: resolve tenant info for frontend (needs X-Tenant-ID header)
router.get('/resolve/current', resolveTenant, requireTenant, tenantController.getCurrentTenant);

export default router;
