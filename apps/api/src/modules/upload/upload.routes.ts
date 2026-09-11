import { Router, Request, Response } from 'express';
import { upload, generateFilename, publicFileUrl, privateFileUrl } from '../../config/upload';
import { putObject } from '../../config/storage';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

const router = Router();

async function store(
  category: Parameters<typeof putObject>[0],
  file: Express.Multer.File
): Promise<string> {
  const filename = generateFilename(file.mimetype);
  await putObject(category, filename, file.buffer, file.mimetype);
  return filename;
}

/**
 * Generic file upload - returns URL of uploaded file
 */
router.post('/file', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibio ningun archivo' });
    }
    const filename = await store('general', req.file);
    res.json({ url: publicFileUrl('general', filename), filename });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ error: 'Error al subir el archivo' });
  }
});

/**
 * Upload identity documents: CI front, CI back, selfie (3 files at once).
 * Stored privately and reachable only through /api/files.
 */
router.post(
  '/identity',
  authenticate,
  upload.fields([
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

      const [ciFront, ciBack, selfie] = await Promise.all([
        store('identity', files.ciFront[0]),
        store('identity', files.ciBack[0]),
        store('identity', files.selfie[0]),
      ]);

      const player = await prisma.player.update({
        where: { userId: req.user!.userId },
        data: {
          ciPhotoFrontUrl: privateFileUrl('identity', ciFront),
          ciPhotoBackUrl: privateFileUrl('identity', ciBack),
          selfieUrl: privateFileUrl('identity', selfie),
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
  upload.single('document'),
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

      const filename = await store('medical', req.file);

      // Deactivate previous clearances
      await prisma.medicalClearance.updateMany({
        where: { playerId: player.id, isActive: true },
        data: { isActive: false },
      });

      const clearance = await prisma.medicalClearance.create({
        data: {
          playerId: player.id,
          documentUrl: privateFileUrl('medical', filename),
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
router.post('/logo', authenticate, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibio el logo' });
    }
    const filename = await store('logos', req.file);
    res.json({ url: publicFileUrl('logos', filename) });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Error al subir el logo' });
  }
});

export default router;
