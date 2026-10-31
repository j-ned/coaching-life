import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Init paresseuse : les variables d'env ne sont lues qu'au premier appel (à la requête),
// jamais au chargement du module. En ESM, les imports s'évaluent AVANT le `dotenv.config()`
// de index.ts : instancier ici planterait avec « Missing env var ».
let _s3: S3Client | null = null;

// Cloudflare R2, compatible S3. Endpoint : https://<ACCOUNT_ID>.r2.cloudflarestorage.com
function getS3(): S3Client {
  if (_s3) return _s3;
  _s3 = new S3Client({
    endpoint: requireEnv('S3_ENDPOINT'),
    region: process.env['S3_REGION'] ?? 'auto', // R2 : 'auto'
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY'),
      secretAccessKey: requireEnv('S3_SECRET_KEY'),
    },
    forcePathStyle: true, // R2 / Garage / MinIO : URL en path-style
    // R2 rejette les checksums CRC32 ajoutés par défaut par le SDK récent (>= 3.729)
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return _s3;
}

function getBucket(): string {
  return requireEnv('S3_BUCKET');
}

export async function uploadFile(
  buffer: ArrayBuffer,
  key: string,
  contentType: string,
): Promise<void> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: contentType,
    }),
  );
}

export async function deleteFile(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}

export async function getFileStream(
  key: string,
): Promise<{ body: ReadableStream; contentType: string }> {
  const res = await getS3().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
  if (!res.Body) throw new Error('Empty body from S3');
  return {
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? 'application/octet-stream',
  };
}
