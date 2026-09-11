import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authLimiter, lookupLimiter } from '../../config/rate-limit';

const router = Router();

// Public routes. Every credential and lookup endpoint is throttled.
router.get('/lookup/:ci', lookupLimiter, authController.lookupCI);
router.post('/register', authLimiter, authController.registerPlayer);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refreshToken);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);

export default router;
