import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, site_settings } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const settingKeySchema = z.enum(['home_hero', 'home_services', 'home_cta']);

const updateSettingSchema = z.object({
  value: z.record(z.unknown()),
});

export const settingRoutes = new Hono()

  // GET /api/settings/:key  (public)
  .get('/:key', zValidator('param', z.object({ key: settingKeySchema })), async (c) => {
    const { key } = c.req.valid('param');
    const [row] = await db.select().from(site_settings).where(eq(site_settings.key, key)).limit(1);
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  })

  // PUT /api/settings/:key  (admin)
  .put(
    '/:key',
    requireAdmin,
    zValidator('param', z.object({ key: settingKeySchema })),
    zValidator('json', updateSettingSchema),
    async (c) => {
      const { key } = c.req.valid('param');
      const { value } = c.req.valid('json');
      const [row] = await db
        .insert(site_settings)
        .values({ key, value, updated_at: new Date() })
        .onConflictDoUpdate({
          target: site_settings.key,
          set: { value, updated_at: new Date() },
        })
        .returning();
      return c.json(row);
    },
  );
