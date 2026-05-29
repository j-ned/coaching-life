// ⚠️ DOIT rester le tout premier import : charge le .env avant l'évaluation des modules
// qui lisent process.env au chargement (session, mailer, db).
import './load-env.js';
import { resolve } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

// Frontend Angular mis en cache au démarrage.
// Routes publiques prérendues (RenderMode.Prerender) → `<route>/index.html` : HTML statique
// avec SEO par route, servi tel quel aux crawlers. Dashboard / routes client → shell CSR.
const BROWSER_ROOT = resolve('./browser');

const prerenderedRoutes = new Map<string, string>();
if (existsSync(BROWSER_ROOT)) {
  const rootIndex = resolve(BROWSER_ROOT, 'index.html');
  if (existsSync(rootIndex)) prerenderedRoutes.set('/', readFileSync(rootIndex, 'utf-8'));

  for (const entry of readdirSync(BROWSER_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const routeIndex = resolve(BROWSER_ROOT, entry.name, 'index.html');
    if (existsSync(routeIndex)) {
      prerenderedRoutes.set(`/${entry.name}`, readFileSync(routeIndex, 'utf-8'));
    }
  }
}

// Shell CSR (fallback pour routes client : dashboard, routes inconnues)
const csrShellPath =
  ['./browser/index.csr.html', './browser/index.html'].map((p) => resolve(p)).find(existsSync) ??
  null;
const csrShell = csrShellPath ? readFileSync(csrShellPath, 'utf-8') : null;

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

if (csrShell) {
  app.use(serveStatic({ root: './browser' }));
  app.get('*', (c) => {
    const path = c.req.path.replace(/\/+$/, '') || '/';
    return c.html(prerenderedRoutes.get(path) ?? csrShell);
  });
}

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
