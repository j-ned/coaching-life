import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { uploadFile, deleteFile, getFileStream } from '../lib/s3.js';
import { requireAdmin } from '../middleware/auth.js';

export const storageRoutes = new Hono()

  // POST /api/storage/upload  (admin)
  .post('/upload', requireAdmin, async (c) => {
    const body = await c.req.formData();
    const file = body.get('file');
    const path = (body.get('path') as string | null) ?? '';

    if (!file || typeof file === 'string') {
      return c.json({ error: 'Fichier manquant' }, 400);
    }

    const buffer = await file.arrayBuffer();
    const key = await uploadFile(buffer, file.name, path);
    // URL relative same-origin : insensible au domaine et au schéma (HTTPS derrière reverse proxy).
    // Évite tout mixed content / couplage au domaine, le front étant servi par ce même backend.
    const publicUrl = `/api/storage/files/${key}`;

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

  // GET /api/storage/files/:key  (public — proxy depuis S3)
  .get('/files/:key{.+}', async (c) => {
    const key = c.req.param('key');
    try {
      const { body, contentType } = await getFileStream(key);
      return new Response(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return c.json({ error: 'Fichier introuvable' }, 404);
    }
  });
