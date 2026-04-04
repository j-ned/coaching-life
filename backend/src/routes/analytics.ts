import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { gte, lte, and, asc, count } from 'drizzle-orm';
import { z } from 'zod';
import { db, page_visits } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

export const analyticsRoutes = new Hono()

  // POST /api/analytics/visits  (public — fire & forget)
  .post(
    '/visits',
    zValidator(
      'json',
      z.object({
        page_path: z.string().max(500),
        referrer: z.string().max(1000).optional(),
        user_agent: z.string().max(500).optional(),
      }),
    ),
    async (c) => {
      const data = c.req.valid('json');
      await db.insert(page_visits).values({
        page_path: data.page_path,
        referrer: data.referrer ?? null,
        user_agent: data.user_agent ?? null,
      });
      return c.json({ ok: true }, 201);
    },
  )

  // GET /api/analytics/visits/count?since=ISO  (admin)
  .get(
    '/visits/count',
    requireAdmin,
    zValidator('query', z.object({ since: z.string() })),
    async (c) => {
      const { since } = c.req.valid('query');
      const [result] = await db
        .select({ count: count() })
        .from(page_visits)
        .where(gte(page_visits.visited_at, new Date(since)));
      return c.json({ count: result?.count ?? 0 });
    },
  )

  // GET /api/analytics/visits?start=ISO&end=ISO  (admin)
  .get(
    '/visits',
    requireAdmin,
    zValidator('query', z.object({ start: z.string(), end: z.string() })),
    async (c) => {
      const { start, end } = c.req.valid('query');
      const rows = await db
        .select()
        .from(page_visits)
        .where(
          and(
            gte(page_visits.visited_at, new Date(start)),
            lte(page_visits.visited_at, new Date(end)),
          ),
        )
        .orderBy(asc(page_visits.visited_at));
      return c.json(rows);
    },
  );
