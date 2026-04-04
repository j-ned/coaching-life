import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { uploadFile, deleteFile, getPublicUrl } from '../lib/s3.js';
import { requireAdmin } from '../middleware/auth.js';

export const storageRoutes = new Hono()

  // POST /api/storage/upload  (admin)
  .post('/upload', requireAdmin, async (c) => {
    const body = await c.req.formData();
    const file = body.get('file');
    const prefix = (body.get('path') as string | null) ?? '';

    if (!file || typeof file === 'string') {
      return c.json({ error: 'Fichier manquant' }, 400);
    }

    const buffer = await file.arrayBuffer();
    const { key, publicUrl } = await uploadFile(buffer, file.name, prefix);

    return c.json({ publicUrl, path: key }, 201);
  })

  // DELETE /api/storage/files  (admin)
  .delete(
    '/files',
    requireAdmin,
    zValidator('json', z.object({ path: z.string().min(1) })),
    async (c) => {
      const { path } = c.req.valid('json');
      await deleteFile(path);
      return c.json({ ok: true });
    },
  )

  // GET /api/storage/files/:key  (public — redirige vers S3)
  .get('/files/:key{.+}', (c) => {
    const key = c.req.param('key');
    return c.redirect(getPublicUrl(key), 302);
  });
