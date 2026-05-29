import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Routes publiques pré-rendues au build → HTML statique avec SEO par route
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'life-coach', renderMode: RenderMode.Prerender },
  { path: 'personal-development', renderMode: RenderMode.Prerender },
  { path: 'equine-coaching', renderMode: RenderMode.Prerender },
  { path: 'neuroatypical-parents', renderMode: RenderMode.Prerender },

  // Dashboard : rendu client uniquement (auth, données privées)
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'dashboard/**', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Client },
];
