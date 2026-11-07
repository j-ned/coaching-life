import { afterEach, describe, expect, it, vi } from 'vitest';
import { storageRoutes } from './storage.js';

const S3_VARS = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'] as const;

function previewWithoutStorage(): void {
  vi.stubEnv('VERCEL_ENV', 'preview');
  for (const name of S3_VARS) vi.stubEnv(name, '');
}

describe('storage désactivé (preview sans S3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET /files/:key répond 503 avec un message explicite au lieu d’un faux 404', async () => {
    previewWithoutStorage();

    const res = await storageRoutes.request('/files/pages/photo.webp');

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'Stockage de fichiers désactivé sur cet environnement',
    });
  });

  it('une configuration S3 partielle reste une erreur de configuration, pas une désactivation', async () => {
    previewWithoutStorage();
    vi.stubEnv('S3_BUCKET', 'bucket');

    const res = await storageRoutes.request('/files/pages/photo.webp');

    expect(res.status).toBe(500);
  });
});
