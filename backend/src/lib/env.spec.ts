import { describe, expect, it } from 'vitest';
import { MissingEnvError, isProductionEnv, readEnv, requireEnv } from './env.js';

describe('requireEnv', () => {
  it('renvoie la valeur quand la variable est définie', () => {
    expect(requireEnv('SMTP_HOST', { SMTP_HOST: 'smtp.example.com' })).toBe('smtp.example.com');
  });

  it.each([undefined, '', '   '])('échoue en nommant la variable quand elle vaut %j', (value) => {
    expect(() => requireEnv('SMTP_HOST', { SMTP_HOST: value })).toThrow(MissingEnvError);
    expect(() => requireEnv('SMTP_HOST', { SMTP_HOST: value })).toThrow(/SMTP_HOST/);
  });
});

describe('readEnv', () => {
  it('traite une chaîne vide comme une variable absente', () => {
    expect(readEnv('S3_BUCKET', { S3_BUCKET: '' })).toBeUndefined();
  });
});

describe('isProductionEnv', () => {
  it.each([
    [{ VERCEL_ENV: 'production' }, true],
    [{ NODE_ENV: 'production' }, true],
    [{ VERCEL_ENV: 'production', NODE_ENV: 'development' }, true],
    // Vercel exécute aussi les previews avec NODE_ENV=production : seul VERCEL_ENV les distingue.
    [{ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, false],
    [{ VERCEL_ENV: 'development', NODE_ENV: 'production' }, false],
    [{ VERCEL_ENV: 'preview' }, false],
    [{ NODE_ENV: 'development' }, false],
    [{}, false],
    // Valeur Vercel inconnue : on retombe sur NODE_ENV, donc strict par défaut en production.
    [{ VERCEL_ENV: 'prod', NODE_ENV: 'production' }, true],
  ])('%j → %s', (env, expected) => {
    expect(isProductionEnv(env)).toBe(expected);
  });
});
