import { createHash } from 'node:crypto';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { routePath } from 'hono/route';
import { getConnInfo } from '@hono/node-server/conninfo';
import { db } from '../db/index.js';
import { createRateLimitStore } from '../db/rate-limit-store.js';
import { readEnv } from '../lib/env.js';
import { substitutedRateLimitStore, withOpportunisticPurge } from '../lib/rate-limit-store.js';

type RateLimitOptions = {
  readonly windowMs: number;
  readonly max: number;
};

const PURGE_INTERVAL_MS = 60_000;

// Le compteur vit dans PostgreSQL : sur Vercel chaque instance de la fonction (et chaque
// démarrage à froid) a sa propre mémoire, un compteur en mémoire n'y limite rien (cf. ADR-0003).
const postgresStore = withOpportunisticPurge(createRateLimitStore(db), {
  intervalMs: PURGE_INTERVAL_MS,
  now: Date.now,
  onPurgeError: (err) => console.error('[rate-limit] purge des fenêtres expirées :', err),
});

// Sur Vercel, la plateforme écrase `x-real-ip` et `x-forwarded-for` avec l'adresse du client :
// ce qu'il envoie lui-même dans ces en-têtes n'arrive pas jusqu'à la fonction.
function vercelClientIp(c: Context): string | undefined {
  const realIp = c.req.header('x-real-ip')?.trim();
  if (realIp) return realIp;
  return c.req.header('x-forwarded-for')?.split(',').at(0)?.trim() || undefined;
}

// Derrière Traefik (Docker) : le proxy AJOUTE l'adresse réelle en fin de `X-Forwarded-For`.
// Les entrées de gauche sont fournies par le client, donc forgeables.
function proxiedClientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Derrière le tunnel Cloudflare, le dernier saut de `X-Forwarded-For` est le connecteur du tunnel,
// le même pour tous les visiteurs. Cloudflare pose l'adresse du visiteur dans `CF-Connecting-IP` en
// écrasant toute valeur envoyée par le client : `CLIENT_IP_HEADER` désigne cet en-tête. Digne de
// confiance seulement si rien d'autre que le tunnel ne joint le serveur (aucun port 80/443 ouvert).
function trustedHeaderClientIp(c: Context): string | undefined {
  const name = readEnv('CLIENT_IP_HEADER')?.trim().toLowerCase();
  if (!name) return undefined;
  return c.req.header(name)?.trim() || undefined;
}

function clientIp(c: Context): string {
  if (readEnv('VERCEL') === '1') return vercelClientIp(c) ?? 'unknown';
  return trustedHeaderClientIp(c) ?? proxiedClientIp(c);
}

// Clé = limiteur + client. Le limiteur est identifié par la route DÉCLARÉE (motif, pas chemin
// demandé) et ses paramètres : le nombre de clés par IP est borné par le code, pas par l'URL.
// Empreinte SHA-256 : longueur fixe (64) quel que soit l'en-tête reçu, et pas d'IP en clair en base.
function limiterKey(c: Context, { windowMs, max }: RateLimitOptions): string {
  const limiter = `${c.req.method} ${routePath(c)} ${windowMs}/${max}`;
  return createHash('sha256')
    .update(`${limiter}\n${clientIp(c)}`)
    .digest('hex');
}

// Rate-limit à fenêtre fixe, partagé entre instances.
// Compteur injoignable : l'erreur est propagée au gestionnaire central (500), la requête n'est
// PAS autorisée. Les routes protégées ont de toute façon besoin de la même base pour aboutir ;
// laisser passer rouvrirait le spam et le bourrage de mots de passe pendant la panne.
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware(async (c, next) => {
    const store = substitutedRateLimitStore() ?? postgresStore;
    const hit = await store.hit(limiterKey(c, options), options.windowMs);

    if (hit.count > options.max) {
      c.header('Retry-After', String(Math.max(1, Math.ceil(hit.retryAfterMs / 1000))));
      return c.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429);
    }

    return next();
  });
}
