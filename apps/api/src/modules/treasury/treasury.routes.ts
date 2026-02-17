import { Router } from 'express';
import * as treasuryController from './treasury.controller';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import { resolveTenant, requireTenant, requireTenantAdmin } from '../../middleware/tenant';

const router = Router();

// Tenant-scoped routes
router.get('/orders', authenticate, resolveTenant, requireTenant, treasuryController.listPaymentOrders);
router.post('/orders', authenticate, resolveTenant, requireTenant, requireTenantAdmin, treasuryController.createPaymentOrder);
router.post('/orders/:id/pay', authenticate, resolveTenant, requireTenant, treasuryController.processPayment);
router.post('/orders/generate-matchday', authenticate, resolveTenant, requireTenant, requireTenantAdmin, treasuryController.generateMatchdayOrders);

// Financial summary
router.get('/summary', authenticate, resolveTenant, requireTenant, requireTenantAdmin, treasuryController.getFinancialSummary);

// Default processing (pre-match check)
router.post('/check-defaults/:matchId', authenticate, resolveTenant, requireTenant, requireTenantAdmin, treasuryController.checkAndApplyDefaults);

// Super-admin: platform revenue
router.get('/platform/revenue', authenticate, requireSuperAdmin, treasuryController.getPlatformRevenue);

// Subscription invoices (Super-Admin)
router.get('/subscriptions', authenticate, requireSuperAdmin, treasuryController.listSubscriptionInvoices);
router.post('/subscriptions', authenticate, requireSuperAdmin, treasuryController.createSubscriptionInvoice);

export default router;
