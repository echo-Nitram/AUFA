import { Router, Request, Response } from 'express';
import { uploadTo, publicFileUrl, privateFileUrl } from '../../config/upload';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

const router = Router();

/**
 * Generic file upload - returns URL of uploaded file
 */
router.post('/file', authenticate, uploadTo('general').single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ningun archivo' });
  }
  res.json({ url: publicFileUrl('general', req.file.filename), filename: req.file.filename });
});

/**
 * Upload identity documents: CI front, CI back, selfie (3 files at once).
 * Stored privately and reachable only through /api/files.
 */
router.post(
  '/identity',
  authenticate,
  uploadTo('identity').fields([
    { name: 'ciFront', maxCount: 1 },
    { name: 'ciBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files?.ciFront?.[0] || !files?.ciBack?.[0] || !files?.selfie?.[0]) {
        return res.status(400).json({ error: 'Se requieren los 3 archivos: ciFront, ciBack, selfie' });
      }

      const player = await prisma.player.update({
        where: { userId: req.user!.userId },
        data: {
          ciPhotoFrontUrl: privateFileUrl('identity', files.ciFront[0].filename),
          ciPhotoBackUrl: privateFileUrl('identity', files.ciBack[0].filename),
          selfieUrl: privateFileUrl('identity', files.selfie[0].filename),
          identityStatus: 'PENDING',
        },
      });

      res.json({
        message: 'Documentos de identidad cargados. Pendiente de validacion.',
        ciPhotoFrontUrl: player.ciPhotoFrontUrl,
        ciPhotoBackUrl: player.ciPhotoBackUrl,
        selfieUrl: player.selfieUrl,
      });
    } catch (error) {
      console.error('Upload identity error:', error);
      res.status(500).json({ error: 'Error al subir documentos de identidad' });
    }
  }
);

/**
 * Upload medical clearance document. Stored privately.
 */
router.post(
  '/medical',
  authenticate,
  uploadTo('medical').single('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibio el documento medico' });
      }

      const { issuedAt, expiresAt } = req.body;
      if (!issuedAt || !expiresAt) {
        return res.status(400).json({ error: 'Se requieren issuedAt y expiresAt' });
      }

      const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
      if (!player) {
        return res.status(404).json({ error: 'Perfil de jugador no encontrado' });
      }

      // Deactivate previous clearances
      await prisma.medicalClearance.updateMany({
        where: { playerId: player.id, isActive: true },
        data: { isActive: false },
      });

      const clearance = await prisma.medicalClearance.create({
        data: {
          playerId: player.id,
          documentUrl: privateFileUrl('medical', req.file.filename),
          issuedAt: new Date(issuedAt),
          expiresAt: new Date(expiresAt),
          isActive: true,
        },
      });

      res.status(201).json({ message: 'Ficha medica cargada exitosamente.', clearance });
    } catch (error) {
      console.error('Upload medical error:', error);
      res.status(500).json({ error: 'Error al subir ficha medica' });
    }
  }
);

/**
 * Upload team/league logo. Public by design - it is rendered on the portal.
 */
router.post('/logo', authenticate, uploadTo('logos').single('logo'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio el logo' });
  }
  res.json({ url: publicFileUrl('logos', req.file.filename) });
});

export default router;
