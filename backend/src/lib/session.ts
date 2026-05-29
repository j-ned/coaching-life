import { SignJWT, jwtVerify } from 'jose';

// Lecture paresseuse : jamais de fallback "prod" silencieux. En production, l'absence de
// SESSION_SECRET fait échouer (sinon n'importe qui forge un JWT admin avec le secret par défaut).
let _secret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (_secret) return _secret;
  const raw = process.env['SESSION_SECRET'];
  if (!raw) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        'SESSION_SECRET manquant : refus de signer/vérifier une session en production.',
      );
    }
    return (_secret = new TextEncoder().encode('dev_only_insecure_secret'));
  }
  return (_secret = new TextEncoder().encode(raw));
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
