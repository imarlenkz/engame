import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Compact signed token: base64url(JSON).signature. Tamper-proof, not secret. */
export function signPayload(secret: string, payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(secret, body)}`;
}

export function verifyPayload<T>(secret: string, token: string): T | null {
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sig, hmac(secret, body))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
