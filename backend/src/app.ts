import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './routes/auth.js';
import { appointmentRoutes } from './routes/appointments.js';
import { messageRoutes } from './routes/messages.js';
import { pageRoutes } from './routes/pages.js';
import { settingRoutes } from './routes/settings.js';
import { analyticsRoutes } from './routes/analytics.js';
import { storageRoutes } from './routes/storage.js';
import { assertRuntimeConfig } from './lib/runtime-config.js';

// Échec au démarrage (Docker comme fonction Vercel) si la configuration est incomplète.
assertRuntimeConfig();

// API seule : partagée par le serveur Node (index.ts, Docker/dev) et la fonction Vercel (api/).
export const app = new Hono();

// Middleware global

app.use(logger());
app.use(
  secureHeaders({
    referrerPolicy: 'strict-origin-when-cross-origin',
    crossOriginResourcePolicy: false,
  }),
);

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

// Routes

app.route('/api/auth', authRoutes);
app.route('/api/appointments', appointmentRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/pages', pageRoutes);
app.route('/api/settings', settingRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/storage', storageRoutes);

// Health check

app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

app.notFound((c) => c.json({ error: 'Route introuvable' }, 404));

app.onError((err, c) => {
  console.error('[ERROR]', err);
  return c.json({ error: 'Erreur interne du serveur' }, 500);
});
