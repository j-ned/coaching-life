export type EnvSource = Readonly<Record<string, string | undefined>>;

export class MissingEnvError extends Error {
  constructor(readonly names: readonly string[]) {
    super(`Variable(s) d'environnement manquante(s) : ${names.join(', ')}`);
    this.name = 'MissingEnvError';
  }
}

// Une variable vide ou blanche est traitée comme absente : un `.env` (Dokploy, dotenv) contient
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

// L'image de production pose NODE_ENV=production (Dockerfile) : c'est le seul signal.
export function isProductionEnv(env: EnvSource = process.env): boolean {
  return readEnv('NODE_ENV', env) === 'production';
}
