import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from './rate-limit.js';

function setup() {
  const app = new Hono().use(rateLimit({ windowMs: 60_000, max: 1 })).get('/', (c) => c.text('ok'));
  return (forwardedFor: string) =>
    app.request('/', { headers: { 'x-forwarded-for': forwardedFor } });
}

describe('rateLimit', () => {
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
});
