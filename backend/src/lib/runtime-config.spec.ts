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

  describe('mail par l’API Resend au lieu de SMTP', () => {
    const RESEND_PRODUCTION_ENV = {
      ...COMPLETE_PRODUCTION_ENV,
      VERCEL_ENV: undefined,
      NODE_ENV: 'production',
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      RESEND_API_KEY: 're_test_key',
      MAIL_FROM: 'noreply@coaching.example',
    } as const;

    it('accepte une production configurée pour Resend, sans aucune variable SMTP', () => {
      expect(() => assertRuntimeConfig(RESEND_PRODUCTION_ENV)).not.toThrow();
    });

    it('fait échouer le démarrage en production si MAIL_FROM manque', () => {
      expect(() => assertRuntimeConfig({ ...RESEND_PRODUCTION_ENV, MAIL_FROM: undefined })).toThrow(
        /MAIL_FROM/,
      );
    });

    it('fait échouer le démarrage en production sans Resend ni SMTP, en nommant RESEND_API_KEY', () => {
      expect(() =>
        assertRuntimeConfig({ ...RESEND_PRODUCTION_ENV, RESEND_API_KEY: undefined }),
      ).toThrow(/RESEND_API_KEY/);
    });
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
