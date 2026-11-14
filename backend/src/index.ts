// DOIT rester le tout premier import : charge le .env avant l'évaluation des modules
// qui lisent process.env au chargement (session, mailer, db).
import './load-env.js';
import { resolve } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app.js';
import { isFilePath, staticCacheControl } from './lib/static-files.js';

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

// Frontend Angular (static)

if (csrShell) {
  app.use(
    serveStatic({
      root: './browser',
      onFound: (_path, c) => {
        c.header('Cache-Control', staticCacheControl(c.req.path));
      },
    }),
  );
  app.get('*', (c) => {
    if (isFilePath(c.req.path)) return c.notFound();
    const path = c.req.path.replace(/\/+$/, '') || '/';
    c.header('Cache-Control', 'no-cache');
    return c.html(prerenderedRoutes.get(path) ?? csrShell);
  });
}

// Start

const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend démarré sur http://localhost:${port}`);
});
