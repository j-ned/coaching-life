import { describe, expect, it } from 'vitest';
import { MissingEnvError } from './env.js';
import { assertRuntimeConfig } from './runtime-config.js';

const SECRET = 's'.repeat(32);

const COMPLETE_PRODUCTION_ENV = {
  VERCEL_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db.example.com/app',
  SESSION_SECRET: SECRET,
  ADMIN_EMAIL: 'admin@example.com',
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'noreply@example.com',
  SMTP_PASS: 'smtp-pass',
  S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  S3_BUCKET: 'bucket',
} as const;

function without(name: keyof typeof COMPLETE_PRODUCTION_ENV) {
  return { ...COMPLETE_PRODUCTION_ENV, [name]: undefined };
}

describe('assertRuntimeConfig', () => {
  it('accepte une production complètement configurée', () => {
    expect(() => assertRuntimeConfig(COMPLETE_PRODUCTION_ENV)).not.toThrow();
  });

  it.each(
    (Object.keys(COMPLETE_PRODUCTION_ENV) as (keyof typeof COMPLETE_PRODUCTION_ENV)[]).filter(
      (name) => name !== 'VERCEL_ENV',
    ),
  )('fait échouer le démarrage en production si %s manque', (name) => {
    expect(() => assertRuntimeConfig(without(name))).toThrow(MissingEnvError);
    expect(() => assertRuntimeConfig(without(name))).toThrow(new RegExp(name));
  });

  it('applique les mêmes exigences quand seul NODE_ENV=production est posé (Docker)', () => {
    expect(() =>
      assertRuntimeConfig({
        ...COMPLETE_PRODUCTION_ENV,
        VERCEL_ENV: undefined,
        NODE_ENV: 'production',
        SMTP_HOST: undefined,
      }),
    ).toThrow(/SMTP_HOST/);
  });

  it('accepte une preview sans SMTP ni S3, avec son propre SESSION_SECRET', () => {
    expect(() =>
      assertRuntimeConfig({
        VERCEL_ENV: 'preview',
        NODE_ENV: 'production',
        SESSION_SECRET: SECRET,
      }),
    ).not.toThrow();
  });

  it('fait aussi échouer le démarrage d’une preview sans SESSION_SECRET', () => {
    expect(() => assertRuntimeConfig({ VERCEL_ENV: 'preview' })).toThrow(/SESSION_SECRET/);
  });
});
