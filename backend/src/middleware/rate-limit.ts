import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getConnInfo } from '@hono/node-server/conninfo';

type RateLimitOptions = {
  readonly windowMs: number;
  readonly max: number;
};

// IP du client telle que vue par le proxy de confiance (Traefik) : il AJOUTE l'adresse réelle
// en fin de `X-Forwarded-For`. Les entrées de gauche sont fournies par le client, donc forgeables.
function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Rate-limit à fenêtre fixe, en mémoire (par instance). Suffisant pour une app mono-instance
// derrière Traefik. Pour du multi-instance, déporter le compteur (ex. Redis).
export function rateLimit({ windowMs, max }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return createMiddleware(async (c, next) => {
    const ip = clientIp(c);
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return c.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429);
      }
    }

    // Purge paresseuse pour borner la mémoire.
    if (hits.size > 10_000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key);
    }

    return next();
  });
}
