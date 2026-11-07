export type EnvSource = Readonly<Record<string, string | undefined>>;

export class MissingEnvError extends Error {
  constructor(readonly names: readonly string[]) {
    super(`Variable(s) d'environnement manquante(s) : ${names.join(', ')}`);
    this.name = 'MissingEnvError';
  }
}

// Une variable vide ou blanche est traitée comme absente : Vercel et dotenv produisent
// volontiers `NAME=` pour une valeur « retirée ».
export function readEnv(name: string, env: EnvSource = process.env): string | undefined {
  const value = env[name];
  return value !== undefined && value.trim() !== '' ? value : undefined;
}

export function requireEnv(name: string, env: EnvSource = process.env): string {
  const value = readEnv(name, env);
  if (value === undefined) throw new MissingEnvError([name]);
  return value;
}

// Vercel exécute aussi les previews avec NODE_ENV=production : seul VERCEL_ENV distingue une
// preview. Hors preview/développement Vercel explicites, on reste strict dès que l'un des deux
// signaux dit « production » (Docker ne pose que NODE_ENV).
export function isProductionEnv(env: EnvSource = process.env): boolean {
  const vercelEnv = readEnv('VERCEL_ENV', env);
  if (vercelEnv === 'preview' || vercelEnv === 'development') return false;
  return vercelEnv === 'production' || readEnv('NODE_ENV', env) === 'production';
}
