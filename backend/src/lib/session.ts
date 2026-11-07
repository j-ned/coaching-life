import { SignJWT, jwtVerify } from 'jose';
import { requireEnv, type EnvSource } from './env.js';

const MIN_SECRET_LENGTH = 32;

// Aucun secret par défaut, dans aucun environnement : le dépôt est public, un secret de repli
// codé en dur permettrait à quiconque de forger un JWT admin.
export function readSessionSecret(env: EnvSource = process.env): Uint8Array {
  const raw = requireEnv('SESSION_SECRET', env);
  if (raw.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET trop court : ${MIN_SECRET_LENGTH} caractères minimum.`);
  }
  return new TextEncoder().encode(raw);
}

// Lecture paresseuse : l'env n'est lu qu'à la première requête, après le chargement du .env.
let _secret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  return (_secret ??= readSessionSecret());
}

const COOKIE_NAME = 'session';
const EXPIRY = '7d';

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload['sub'] as string,
      email: payload['email'] as string,
      name: payload['name'] as string,
      role: payload['role'] as string,
    };
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string): string {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${7 * 24 * 3600}`,
    'SameSite=Lax',
    ...(isProduction ? ['Secure'] : []),
  ];
  return parts.join('; ');
}

export function clearSessionCookieHeader(): string {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
    ...(isProduction ? ['Secure'] : []),
  ];
  return parts.join('; ');
}

export { COOKIE_NAME };
