import { createMiddleware } from 'hono/factory';

type RateLimitOptions = {
  readonly windowMs: number;
  readonly max: number;
};

// Rate-limit à fenêtre fixe, en mémoire (par instance). Suffisant pour une app mono-instance
// derrière Traefik. Pour du multi-instance, déporter le compteur (ex. Redis).
export function rateLimit({ windowMs, max }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';
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
