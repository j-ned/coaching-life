import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from './rate-limit.js';
import { useRateLimitStore } from '../lib/rate-limit-store.js';
import {
  InMemoryRateLimitStore,
  ManualClock,
  UnreachableRateLimitStore,
} from '../test/rate-limit-fakes.js';

// Chaque setup installe un compteur en mémoire neuf : le compteur n'appartient plus à l'instance
// du middleware mais à un stockage partagé, qu'il faut donc isoler d'un test à l'autre.
function setup() {
  useRateLimitStore(new InMemoryRateLimitStore());
  const app = new Hono().use(rateLimit({ windowMs: 60_000, max: 1 })).get('/', (c) => c.text('ok'));
  return (forwardedFor: string) =>
    app.request('/', { headers: { 'x-forwarded-for': forwardedFor } });
}

function setupWithStore(max = 2) {
  const clock = new ManualClock();
  const store = new InMemoryRateLimitStore(clock);
  useRateLimitStore(store);
  const app = new Hono()
    .get('/a', rateLimit({ windowMs: 60_000, max }), (c) => c.text('a'))
    .get('/b', rateLimit({ windowMs: 60_000, max }), (c) => c.text('b'))
    .get('/items/:id', rateLimit({ windowMs: 60_000, max }), (c) => c.text('item'));
  const request = (path: string, headers: Record<string, string> = {}) =>
    app.request(path, { headers: { 'x-forwarded-for': '203.0.113.7', ...headers } });
  return { request, clock, store };
}

describe('rateLimit', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('compte par IP ajoutée par le proxy (entrée la plus à droite) et ignore ce que le client forge à gauche', async () => {
    const request = setup();

    expect((await request('1.1.1.1, 203.0.113.7')).status).toBe(200);
    expect((await request('2.2.2.2, 203.0.113.7')).status).toBe(429);
  });

  it('distingue deux clients différents', async () => {
    const request = setup();

    expect((await request('203.0.113.7')).status).toBe(200);
    expect((await request('203.0.113.8')).status).toBe(200);
  });

  it('laisse passer max requêtes puis répond 429 avec le délai restant de la fenêtre', async () => {
    const { request, clock } = setupWithStore(2);
    clock.advance(12_500);

    const statuses = [(await request('/a')).status, (await request('/a')).status];
    const refused = await request('/a');

    expect(statuses).toEqual([200, 200]);
    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe('48');
    expect(await refused.json()).toEqual({ error: 'Trop de tentatives. Réessayez plus tard.' });
  });

  it('rouvre le quota à la fenêtre suivante', async () => {
    const { request, clock } = setupWithStore(1);
    await request('/a');
    const refused = await request('/a');

    clock.advance(60_000);
    const afterRollover = await request('/a');

    expect(refused.status).toBe(429);
    expect(afterRollover.status).toBe(200);
  });

  it('compte séparément deux routes limitées pour une même IP', async () => {
    const { request } = setupWithStore(1);
    await request('/a');

    const otherRoute = await request('/b');
    const sameRoute = await request('/a');

    expect(otherRoute.status).toBe(200);
    expect(sameRoute.status).toBe(429);
  });

  it("compte par route déclarée, pas par chemin demandé : varier l'URL ne contourne pas la limite", async () => {
    const { request, store } = setupWithStore(1);
    await request('/items/1');

    const otherPath = await request('/items/2');

    expect(otherPath.status).toBe(429);
    expect(new Set(store.keys).size).toBe(1);
  });

  it("borne la longueur de la clé quelle que soit la taille de l'en-tête reçu", async () => {
    const { request, store } = setupWithStore();

    await request('/a', { 'x-forwarded-for': 'x'.repeat(10_000) });
    await request('/a');

    expect(store.keys.map((key) => key.length)).toEqual([64, 64]);
  });

  it('refuse la requête en 500, sans exécuter la route, quand le compteur est injoignable', async () => {
    const store = new UnreachableRateLimitStore();
    useRateLimitStore(store);
    const handled: string[] = [];
    const errors: unknown[] = [];
    const app = new Hono()
      .get('/', rateLimit({ windowMs: 60_000, max: 1 }), (c) => {
        handled.push('route');
        return c.text('ok');
      })
      .onError((err, c) => {
        errors.push(err);
        return c.json({ error: 'Erreur interne du serveur' }, 500);
      });

    const response = await app.request('/');

    expect(response.status).toBe(500);
    expect(handled).toEqual([]);
    expect(errors).toEqual([store.failure]);
  });

  describe('derrière le tunnel Cloudflare (CLIENT_IP_HEADER)', () => {
    it("identifie le client par l'en-tête désigné, pas par x-forwarded-for où le tunnel est le dernier saut", async () => {
      vi.stubEnv('CLIENT_IP_HEADER', 'cf-connecting-ip');
      const { request } = setupWithStore(1);
      await request('/a', { 'cf-connecting-ip': '198.51.100.4', 'x-forwarded-for': '172.18.0.5' });

      const sameClient = await request('/a', {
        'cf-connecting-ip': '198.51.100.4',
        'x-forwarded-for': '1.1.1.1, 172.18.0.9',
      });
      const otherClient = await request('/a', {
        'cf-connecting-ip': '198.51.100.5',
        'x-forwarded-for': '172.18.0.5',
      });

      expect(sameClient.status).toBe(429);
      expect(otherClient.status).toBe(200);
    });

    it("lit le nom de l'en-tête sans tenir compte de la casse ni des espaces", async () => {
      vi.stubEnv('CLIENT_IP_HEADER', ' CF-Connecting-IP ');
      const { request } = setupWithStore(1);
      await request('/a', { 'cf-connecting-ip': '198.51.100.4', 'x-forwarded-for': '172.18.0.5' });

      const otherClient = await request('/a', {
        'cf-connecting-ip': '198.51.100.5',
        'x-forwarded-for': '172.18.0.5',
      });

      expect(otherClient.status).toBe(200);
    });

    it("sans l'en-tête désigné, retombe sur le dernier saut de x-forwarded-for, jamais sur une entrée forgeable", async () => {
      vi.stubEnv('CLIENT_IP_HEADER', 'cf-connecting-ip');
      const { request } = setupWithStore(1);
      await request('/a', { 'x-forwarded-for': '1.1.1.1, 172.18.0.5' });

      const forgedLeft = await request('/a', { 'x-forwarded-for': '2.2.2.2, 172.18.0.5' });

      expect(forgedLeft.status).toBe(429);
    });
  });

  describe('sur Vercel', () => {
    it("identifie le client par x-real-ip et ignore un x-forwarded-for qu'il aurait forgé", async () => {
      vi.stubEnv('VERCEL', '1');
      const { request } = setupWithStore(1);
      await request('/a', { 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '1.1.1.1' });

      const sameClient = await request('/a', {
        'x-real-ip': '198.51.100.4',
        'x-forwarded-for': '2.2.2.2',
      });
      const otherClient = await request('/a', {
        'x-real-ip': '198.51.100.5',
        'x-forwarded-for': '1.1.1.1',
      });

      expect(sameClient.status).toBe(429);
      expect(otherClient.status).toBe(200);
    });

    it('sans x-real-ip, retient le premier saut de x-forwarded-for posé par la plateforme', async () => {
      vi.stubEnv('VERCEL', '1');
      const { request } = setupWithStore(1);
      await request('/a', { 'x-forwarded-for': '198.51.100.4, 10.0.0.1' });

      const sameClient = await request('/a', { 'x-forwarded-for': '198.51.100.4, 10.0.0.2' });
      const otherClient = await request('/a', { 'x-forwarded-for': '198.51.100.5, 10.0.0.1' });

      expect(sameClient.status).toBe(429);
      expect(otherClient.status).toBe(200);
    });
  });
});
