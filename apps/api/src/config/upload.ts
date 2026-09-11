import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from './env';

export const uploadDir = path.resolve(env.upload.dir);

/**
 * Identity documents and medical records are personal data: they are written to
 * their own folders and are never served by the static handler. Only `logos` and
 * `general` are public.
 */
export const PUBLIC_CATEGORIES = ['logos', 'general'] as const;
export const PRIVATE_CATEGORIES = ['identity', 'medical'] as const;

export type UploadCategory =
  | (typeof PUBLIC_CATEGORIES)[number]
  | (typeof PRIVATE_CATEGORIES)[number];

const ALL_CATEGORIES: UploadCategory[] = [...PUBLIC_CATEGORIES, ...PRIVATE_CATEGORIES];

for (const category of ALL_CATEGORIES) {
  fs.mkdirSync(path.join(uploadDir, category), { recursive: true });
}

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

export function uploadTo(category: UploadCategory) {
  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        cb(null, path.join(uploadDir, category));
      },
      filename(_req, file, cb) {
        // Unguessable: private documents must not be reachable by enumeration.
        cb(null, `${crypto.randomBytes(16).toString('hex')}${EXTENSION_BY_MIME[file.mimetype]}`);
      },
    }),
    fileFilter,
    limits: { fileSize: env.upload.maxFileSize },
  });
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
