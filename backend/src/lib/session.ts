import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env['SESSION_SECRET'] ?? 'dev_secret_change_in_production',
);

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
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
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
    'SameSite=None',
    ...(isProduction ? ['Secure'] : []),
  ];
  return parts.join('; ');
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=None`;
}

export { COOKIE_NAME };
