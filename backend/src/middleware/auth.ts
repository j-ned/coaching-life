import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifySession, COOKIE_NAME } from '../lib/session.js';
import type { SessionPayload } from '../lib/session.js';

type AuthEnv = {
  Variables: { user: SessionPayload };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return c.json({ error: 'Non authentifié' }, 401);

  const payload = await verifySession(token);
  if (!payload) return c.json({ error: 'Session invalide' }, 401);

  c.set('user', payload);
  return next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return c.json({ error: 'Non authentifié' }, 401);

  const payload = await verifySession(token);
  if (!payload) return c.json({ error: 'Session invalide' }, 401);
  if (payload.role !== 'admin') return c.json({ error: 'Accès refusé' }, 403);

  c.set('user', payload);
  return next();
});
