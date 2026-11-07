import { MissingEnvError, isProductionEnv, readEnv, type EnvSource } from './env.js';
import { readSessionSecret } from './session.js';

const PRODUCTION_REQUIRED = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'ADMIN_EMAIL',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
] as const;

// Vérifiée au chargement de l'app : une production mal configurée doit refuser de démarrer
// plutôt que de dégrader en silence (mails perdus, uploads en 500, sessions impossibles).
export function assertRuntimeConfig(env: EnvSource = process.env): void {
  if (isProductionEnv(env)) {
    const missing = PRODUCTION_REQUIRED.filter((name) => readEnv(name, env) === undefined);
    if (missing.length > 0) throw new MissingEnvError(missing);
  }
  readSessionSecret(env);
}
