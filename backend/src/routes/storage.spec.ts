import { afterEach, describe, expect, it, vi } from 'vitest';
import { storageRoutes } from './storage.js';

const S3_VARS = ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'] as const;

function devWithoutStorage(): void {
  vi.stubEnv('NODE_ENV', 'development');
  for (const name of S3_VARS) vi.stubEnv(name, '');
}

describe('storage désactivé (hors production, sans S3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET /files/:key répond 503 avec un message explicite au lieu d’un faux 404', async () => {
    devWithoutStorage();

    const res = await storageRoutes.request('/files/pages/photo.webp');

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'Stockage de fichiers désactivé sur cet environnement',
    });
  });

  it('une configuration S3 partielle reste une erreur de configuration, pas une désactivation', async () => {
    devWithoutStorage();
    vi.stubEnv('S3_BUCKET', 'bucket');

    const res = await storageRoutes.request('/files/pages/photo.webp');

    expect(res.status).toBe(500);
  });
});
