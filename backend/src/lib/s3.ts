import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const BUCKET = requireEnv('S3_BUCKET');

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
  path = '',
): Promise<string> {
  const ext = extname(originalName).toLowerCase() || '.bin';
  const key = path || `${randomUUID()}${ext}`;
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: contentType,
    }),
  );

  return key;
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

export async function getFileStream(
  key: string,
): Promise<{ body: ReadableStream; contentType: string }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error('Empty body from S3');
  return {
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? 'application/octet-stream',
  };
}
