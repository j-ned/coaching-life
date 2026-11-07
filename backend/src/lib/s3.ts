import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

import { MissingEnvError, isProductionEnv, readEnv, requireEnv, type EnvSource } from './env.js';

const S3_REQUIRED = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'] as const;

export type StorageConfig = {
  readonly endpoint: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
};

export class StorageDisabledError extends Error {
  constructor() {
    super('Stockage de fichiers désactivé : aucune variable S3_* configurée.');
    this.name = 'StorageDisabledError';
  }
}

// `null` = stockage volontairement désactivé (preview/dev sans aucune variable S3_*).
// Une configuration partielle ou absente en production reste une erreur de configuration.
export function readStorageConfig(env: EnvSource = process.env): StorageConfig | null {
  const missing = S3_REQUIRED.filter((name) => readEnv(name, env) === undefined);
  if (missing.length === S3_REQUIRED.length && !isProductionEnv(env)) return null;
  if (missing.length > 0) throw new MissingEnvError(missing);
  return {
    endpoint: requireEnv('S3_ENDPOINT', env),
    region: readEnv('S3_REGION', env) ?? 'auto', // R2 : 'auto'
    accessKeyId: requireEnv('S3_ACCESS_KEY', env),
    secretAccessKey: requireEnv('S3_SECRET_KEY', env),
    bucket: requireEnv('S3_BUCKET', env),
  };
}

export function isStorageEnabled(): boolean {
  return readStorageConfig() !== null;
}

// Init paresseuse : les variables d'env ne sont lues qu'au premier appel (à la requête),
// jamais au chargement du module. En ESM, les imports s'évaluent AVANT le `dotenv.config()`
// de index.ts : instancier ici planterait avec « Missing env var ».
let _s3: { readonly client: S3Client; readonly bucket: string } | null = null;

// Cloudflare R2, compatible S3. Endpoint : https://<ACCOUNT_ID>.r2.cloudflarestorage.com
function getS3(): { readonly client: S3Client; readonly bucket: string } {
  if (_s3) return _s3;
  const config = readStorageConfig();
  if (!config) throw new StorageDisabledError();
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // R2 / Garage / MinIO : URL en path-style
    // R2 rejette les checksums CRC32 ajoutés par défaut par le SDK récent (>= 3.729)
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return (_s3 = { client, bucket: config.bucket });
}

export async function uploadFile(
  buffer: ArrayBuffer,
  key: string,
  contentType: string,
): Promise<void> {
  const { client, bucket } = getS3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: contentType,
    }),
  );
}

export async function deleteFile(key: string): Promise<void> {
  const { client, bucket } = getS3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getFileStream(
  key: string,
): Promise<{ body: ReadableStream; contentType: string }> {
  const { client, bucket } = getS3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error('Empty body from S3');
  return {
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? 'application/octet-stream',
  };
}
