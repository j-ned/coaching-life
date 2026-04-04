import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getCookie } from 'hono/cookie';
import { db, users } from '../db/index.js';
import {
  signSession,
  verifySession,
  sessionCookieHeader,
  clearSessionCookieHeader,
  COOKIE_NAME,
} from '../lib/session.js';
import { requireAdmin } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes = new Hono()

  // POST /api/auth/login
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return c.json({ error: 'Identifiants invalides' }, 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return c.json({ error: 'Identifiants invalides' }, 401);

    const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role });
    c.header('Set-Cookie', sessionCookieHeader(token));

    return c.json({ userId: user.id, email: user.email, name: user.name, role: user.role });
  })

  // POST /api/auth/logout
  .post('/logout', (c) => {
    c.header('Set-Cookie', clearSessionCookieHeader());
    return c.json({ ok: true });
  })

  // GET /api/auth/me
  .get('/me', requireAdmin, (c) => {
    const user = c.get('user');
    return c.json({ id: user.sub, email: user.email, name: user.name, role: user.role });
  })

  // GET /api/auth/session
  .get('/session', async (c) => {
    const token = getCookie(c, COOKIE_NAME);
    if (!token) return c.json(null, 401);
    const payload = await verifySession(token);
    if (!payload) return c.json(null, 401);
    return c.json({ userId: payload.sub, expire: 'active' });
  });
