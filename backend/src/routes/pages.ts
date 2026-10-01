import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db, pages } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const pageSlugSchema = z.enum([
  'life-coach',
  'personal-development',
  'equine-coaching',
  'neuroatypical-parents',
]);

// Les images uploadées sont stockées en chemin relatif same-origin (cf. migration 0001).
// Une chaîne vide signifie « pas d'image » et est normalisée en null.
const imageUrlSchema = z
  .union([
    z.url({ protocol: /^https?$/ }),
    z
      .string()
      .startsWith('/api/storage/files/')
      .refine((v) => !v.includes('..')),
    z.literal(''),
  ])
  .nullable()
  .transform((v) => (v === '' ? null : v));

const updatePageSchema = z
  .object({
    title: z.string().min(1).max(200),
    introduction: z.string().max(5000),
    section_title: z.string().max(200),
    items: z.array(z.object({ title: z.string(), description: z.string() })),
    extra_text: z.string().max(2000).nullable(),
    image_url: imageUrlSchema,
    image_alt: z.string().max(200),
  })
  .partial();

export const pageRoutes = new Hono()

  // GET /api/pages  (public)
  .get('/', async (c) => {
    const rows = await db.select().from(pages).orderBy(asc(pages.slug));
    return c.json(rows);
  })

  // GET /api/pages/:slug  (public)
  .get('/:slug', zValidator('param', z.object({ slug: pageSlugSchema })), async (c) => {
    const { slug } = c.req.valid('param');
    const [row] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  })

  // PATCH /api/pages/:slug  (admin)
  .patch(
    '/:slug',
    requireAdmin,
    zValidator('param', z.object({ slug: pageSlugSchema })),
    zValidator('json', updatePageSchema),
    async (c) => {
      const { slug } = c.req.valid('param');
      const data = c.req.valid('json');
      const [row] = await db
        .update(pages)
        .set({ ...data, updated_at: new Date() })
        .where(eq(pages.slug, slug))
        .returning();
      if (!row) return c.json({ error: 'Not found' }, 404);
      return c.json(row);
    },
  );
