import { describe, expect, it } from 'vitest';
import { MissingEnvError, isProductionEnv, readEnv, requireEnv } from './env.js';

describe('requireEnv', () => {
  it('renvoie la valeur quand la variable est définie', () => {
    expect(requireEnv('RESEND_API_KEY', { RESEND_API_KEY: 're_test_key' })).toBe('re_test_key');
  });

  it.each([undefined, '', '   '])('échoue en nommant la variable quand elle vaut %j', (value) => {
    expect(() => requireEnv('RESEND_API_KEY', { RESEND_API_KEY: value })).toThrow(MissingEnvError);
    expect(() => requireEnv('RESEND_API_KEY', { RESEND_API_KEY: value })).toThrow(/RESEND_API_KEY/);
  });
});

describe('readEnv', () => {
  it('traite une chaîne vide comme une variable absente', () => {
    expect(readEnv('S3_BUCKET', { S3_BUCKET: '' })).toBeUndefined();
  });
});

describe('isProductionEnv', () => {
  it.each([
    [{ NODE_ENV: 'production' }, true],
    [{ NODE_ENV: 'development' }, false],
    [{ NODE_ENV: 'test' }, false],
    [{}, false],
    // Plus d'hébergement Vercel : ses variables n'ont plus aucun effet, seul NODE_ENV compte.
    [{ VERCEL_ENV: 'production' }, false],
    [{ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, true],
  ])('%j → %s', (env, expected) => {
    expect(isProductionEnv(env)).toBe(expected);
  });
});
