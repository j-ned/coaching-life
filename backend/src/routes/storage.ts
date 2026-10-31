import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { bodyLimit } from 'hono/body-limit';
import { uploadFile, deleteFile, getFileStream } from '../lib/s3.js';
import { requireAdmin } from '../middleware/auth.js';
import { MAX_UPLOAD_BYTES, buildStorageKey, detectImageType } from '../lib/upload-policy.js';

const TOO_LARGE = 'Image trop lourde (5 Mo maximum)';

export const storageRoutes = new Hono()

  // POST /api/storage/upload  (admin)
  .post(
    '/upload',
    requireAdmin,
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES + 64 * 1024,
      onError: (c) => c.json({ error: TOO_LARGE }, 413),
    }),
    async (c) => {
      const body = await c.req.formData();
      const file = body.get('file');
      const path = (body.get('path') as string | null) ?? '';

      if (!file || typeof file === 'string') {
        return c.json({ error: 'Fichier manquant' }, 400);
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return c.json({ error: TOO_LARGE }, 413);
      }

      const buffer = await file.arrayBuffer();
      const type = detectImageType(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16)));
      if (!type) {
        return c.json({ error: 'Format non pris en charge (JPEG, PNG, WebP ou AVIF)' }, 415);
      }

      const key = buildStorageKey(path, type.ext);
      await uploadFile(buffer, key, type.mime);
      // URL relative same-origin : insensible au domaine et au schéma (HTTPS derrière reverse proxy).
      // Évite tout mixed content / couplage au domaine, le front étant servi par ce même backend.
      const publicUrl = `/api/storage/files/${key}`;

      return c.json({ publicUrl, path: key }, 201);
    },
  )

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

  // GET /api/storage/files/:key (public, proxy depuis S3)
  .get('/files/:key{.+}', async (c) => {
    const key = c.req.param('key');
    try {
      const { body, contentType } = await getFileStream(key);
      return new Response(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          // Fichiers servis same-origin : jamais interprétés comme document actif.
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        },
      });
    } catch {
      return c.json({ error: 'Fichier introuvable' }, 404);
    }
  });
