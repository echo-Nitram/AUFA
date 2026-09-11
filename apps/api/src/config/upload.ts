import multer from 'multer';
import crypto from 'crypto';
import { env } from './env';
import { PRIVATE_CATEGORIES, PUBLIC_CATEGORIES } from './storage';

export { PUBLIC_CATEGORIES, PRIVATE_CATEGORIES };

// The extension comes from the accepted mime type, never from the uploaded file
// name: a client-supplied ".html" would otherwise be stored and later served as
// markup from the API origin.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

function fileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (EXTENSION_BY_MIME[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan JPG, PNG, WEBP y PDF.'));
  }
}

/**
 * Files are held in memory and then handed to the storage driver, so the same
 * code path works whether they end up on disk or in object storage. The size
 * cap keeps that safe.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: env.upload.maxFileSize },
});

/** Unguessable: private documents must not be reachable by enumeration. */
export function generateFilename(mimetype: string): string {
  return `${crypto.randomBytes(16).toString('hex')}${EXTENSION_BY_MIME[mimetype]}`;
}

/** URL for a publicly served file (logos, generic attachments). */
export function publicFileUrl(category: (typeof PUBLIC_CATEGORIES)[number], filename: string) {
  return `/uploads/${category}/${filename}`;
}

/** URL for a file served only through the authorized download route. */
export function privateFileUrl(category: (typeof PRIVATE_CATEGORIES)[number], filename: string) {
  return `/api/files/${category}/${filename}`;
}

/** Rejects anything that is not a plain generated file name (no traversal, no nesting). */
export function isSafeFilename(filename: string) {
  return /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/.test(filename);
}
