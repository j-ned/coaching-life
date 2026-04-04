import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const s3 = new S3Client({
  endpoint: process.env['S3_ENDPOINT']!,
  region: process.env['S3_REGION'] ?? 'garage',
  credentials: {
    accessKeyId: process.env['S3_ACCESS_KEY_ID']!,
    secretAccessKey: process.env['S3_SECRET_ACCESS_KEY']!,
  },
  forcePathStyle: true, // requis pour Garage / MinIO
});

const BUCKET = process.env['S3_BUCKET']!;
const PUBLIC_URL = process.env['S3_PUBLIC_URL']!; // ex: https://s3.j-ned.dev/coaching-img

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function uploadFile(
  buffer: ArrayBuffer,
  originalName: string,
  prefix = '',
): Promise<{ key: string; publicUrl: string }> {
  const ext = extname(originalName).toLowerCase() || '.bin';
  const key = prefix ? `${prefix}/${randomUUID()}${ext}` : `${randomUUID()}${ext}`;
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: contentType,
    }),
  );

  return { key, publicUrl: getPublicUrl(key) };
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL.replace(/\/$/, '')}/${key}`;
}
