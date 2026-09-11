import fs from 'fs/promises';
import path from 'path';
import { AwsClient } from 'aws4fetch';
import { env } from './env';

export const PUBLIC_CATEGORIES = ['logos', 'general'] as const;
export const PRIVATE_CATEGORIES = ['identity', 'medical'] as const;

export type StorageCategory =
  | (typeof PUBLIC_CATEGORIES)[number]
  | (typeof PRIVATE_CATEGORIES)[number];

export const ALL_CATEGORIES: StorageCategory[] = [...PUBLIC_CATEGORIES, ...PRIVATE_CATEGORIES];

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export function contentTypeFor(filename: string): string {
  return CONTENT_TYPE_BY_EXT[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Object storage is used when it is configured, and the local disk otherwise.
 *
 * Every host worth deploying to on a small budget has an ephemeral filesystem,
 * so identity documents written to disk vanish on the next deploy. Locally the
 * disk is simpler and needs no account, hence the two drivers.
 */
export function usingObjectStorage(): boolean {
  return Boolean(env.s3.bucket && env.s3.endpoint && env.s3.accessKeyId && env.s3.secretAccessKey);
}

const uploadDir = path.resolve(env.upload.dir);

function diskPath(category: StorageCategory, filename: string): string {
  return path.join(uploadDir, category, filename);
}

let client: AwsClient | null = null;
function awsClient(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId: env.s3.accessKeyId!,
      secretAccessKey: env.s3.secretAccessKey!,
      region: env.s3.region,
      service: 's3',
    });
  }
  return client;
}

function objectUrl(category: StorageCategory, filename: string): string {
  return `${env.s3.endpoint!.replace(/\/$/, '')}/${env.s3.bucket}/${category}/${filename}`;
}

export async function putObject(
  category: StorageCategory,
  filename: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (!usingObjectStorage()) {
    await fs.mkdir(path.join(uploadDir, category), { recursive: true });
    await fs.writeFile(diskPath(category, filename), body);
    return;
  }

  const response = await awsClient().fetch(objectUrl(category, filename), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': contentType },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`No se pudo guardar el archivo (${response.status}): ${detail}`);
  }
}

/** Returns null when the object does not exist, so callers can answer 404. */
export async function getObject(
  category: StorageCategory,
  filename: string
): Promise<StoredObject | null> {
  if (!usingObjectStorage()) {
    try {
      const body = await fs.readFile(diskPath(category, filename));
      return { body, contentType: contentTypeFor(filename) };
    } catch {
      return null;
    }
  }

  const response = await awsClient().fetch(objectUrl(category, filename));
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo (${response.status})`);
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? contentTypeFor(filename),
  };
}
