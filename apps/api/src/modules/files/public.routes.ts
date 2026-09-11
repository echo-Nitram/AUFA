import { Router, Request, Response } from 'express';
import { isSafeFilename } from '../../config/upload';
import { PUBLIC_CATEGORIES, StorageCategory, getObject } from '../../config/storage';

const router = Router();

/**
 * Serves logos and generic attachments.
 *
 * These go through the storage driver rather than a static handler so that the
 * URL is the same whether the file sits on local disk or in object storage.
 * Only the public categories are reachable here; identity documents and medical
 * records are served by /api/files, which checks who is asking.
 */
router.get('/:category/:filename', async (req: Request, res: Response) => {
  try {
    const { category, filename } = req.params;

    if (!(PUBLIC_CATEGORIES as readonly string[]).includes(category)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    if (!isSafeFilename(filename)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const object = await getObject(category as StorageCategory, filename);
    if (!object) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(object.body);
  } catch (error) {
    console.error('GetPublicFile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
