// Fonction Vercel : toute requête /api/* (cf. rewrites de vercel.json) passe par l'app Hono,
// compilée par `pnpm --filter @coaching-life/backend build` pendant le build Vercel.
import { app } from '../backend/dist/app.js';

const handler = (request) => app.fetch(request);

export const GET = handler;
export const HEAD = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
