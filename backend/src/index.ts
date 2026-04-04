import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Charge le .env racine du monorepo (../../ depuis backend/src/)
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { appointmentRoutes } from './routes/appointments.js';
import { messageRoutes } from './routes/messages.js';
import { pageRoutes } from './routes/pages.js';
import { settingRoutes } from './routes/settings.js';
import { analyticsRoutes } from './routes/analytics.js';
import { storageRoutes } from './routes/storage.js';

// Angular index.html mis en cache au démarrage (fallback SPA)
const indexHtml = readFileSync(resolve('./browser/index.html'), 'utf-8');

const app = new Hono();

// ─── Middleware global ─────────────────────────────────────────────────────

app.use(logger());

app.use(
  '/api/*',
  cors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
);

// ─── Routes ────────────────────────────────────────────────────────────────

app.route('/api/auth', authRoutes);
app.route('/api/appointments', appointmentRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/pages', pageRoutes);
app.route('/api/settings', settingRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/storage', storageRoutes);

// ─── Health check ──────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Frontend Angular (static) ─────────────────────────────────────────────

app.use(serveStatic({ root: './browser' }));
app.get('*', (c) => c.html(indexHtml));

app.notFound((c) => c.json({ error: 'Route introuvable' }, 404));

app.onError((err, c) => {
  console.error('[ERROR]', err);
  return c.json({ error: 'Erreur interne du serveur' }, 500);
});

// ─── Start ─────────────────────────────────────────────────────────────────

const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Backend démarré sur http://localhost:${port}`);
});
