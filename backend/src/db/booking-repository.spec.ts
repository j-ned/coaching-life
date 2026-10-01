import { describe, expect, it } from 'vitest';
import pg from 'pg';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { isExclusionViolation } from './booking-repository.js';

function pgError(code: string): pg.DatabaseError {
  return Object.assign(new pg.DatabaseError('violation de contrainte', 0, 'error'), { code });
}

function drizzleError(cause?: Error): DrizzleQueryError {
  return new DrizzleQueryError('insert into "appointments" …', [], cause);
}

describe('isExclusionViolation', () => {
  it.each([
    { cas: 'erreur du driver en 23P01', err: pgError('23P01') },
    { cas: 'erreur Drizzle enveloppant un 23P01', err: drizzleError(pgError('23P01')) },
  ])('reconnaît une $cas', ({ err }) => {
    expect(isExclusionViolation(err)).toBe(true);
  });

  it.each([
    { cas: 'erreur du driver en 23505 (unicité)', err: pgError('23505') },
    { cas: 'erreur Drizzle enveloppant un 23505', err: drizzleError(pgError('23505')) },
    { cas: 'erreur Drizzle sans cause', err: drizzleError() },
    { cas: 'erreur sans code', err: new Error('Connexion perdue') },
    { cas: 'valeur nulle', err: null },
    { cas: 'valeur indéfinie', err: undefined },
    { cas: 'chaîne portant le code', err: '23P01' },
  ])('ignore une $cas', ({ err }) => {
    expect(isExclusionViolation(err)).toBe(false);
  });
});
