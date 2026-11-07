import { describe, expect, it } from 'vitest';
import { readSessionSecret } from './session.js';

const VALID_SECRET = 'a'.repeat(32);

describe('readSessionSecret', () => {
  it('encode le secret fourni par SESSION_SECRET', () => {
    expect(readSessionSecret({ SESSION_SECRET: VALID_SECRET })).toEqual(
      new TextEncoder().encode(VALID_SECRET),
    );
  });

  it.each([
    { NODE_ENV: 'production' },
    { VERCEL_ENV: 'preview', NODE_ENV: 'production' },
    { NODE_ENV: 'development' },
    {},
  ])('refuse de fonctionner sans SESSION_SECRET, sans secret par défaut (%j)', (env) => {
    expect(() => readSessionSecret(env)).toThrow(/SESSION_SECRET/);
  });

  it('refuse un secret trop court pour HS256', () => {
    expect(() => readSessionSecret({ SESSION_SECRET: 'a'.repeat(31) })).toThrow(/32/);
  });
});
