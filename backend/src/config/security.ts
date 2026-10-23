import crypto from 'crypto';
import { argon2id } from '@noble/hashes/argon2';
import { env } from './env.js';

const ARGON2_MEMORY = env.NODE_ENV === 'test' ? 4096 : 19456; // OWASP recommended 19 MiB in prod/dev, fast in unit test
const ARGON2_TIME = env.NODE_ENV === 'test' ? 2 : 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_KEY_LEN = 32;

/**
 * Gera hash de senha com algoritmo Argon2id (formato PHC $argon2id$v=19$...)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = argon2id(password, salt, {
    m: ARGON2_MEMORY,
    t: ARGON2_TIME,
    p: ARGON2_PARALLELISM,
    dkLen: ARGON2_KEY_LEN,
  });

  const saltB64 = Buffer.from(salt).toString('base64url');
  const hashB64 = Buffer.from(derived).toString('base64url');
  return `$argon2id$v=19$m=${ARGON2_MEMORY},t=${ARGON2_TIME},p=${ARGON2_PARALLELISM}$${saltB64}$${hashB64}`;
}

/**
 * Verifica senha contra hash Argon2id em tempo constante
 */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith('$argon2id$')) {
    return false;
  }

  try {
    const parts = storedHash.split('$');
    // ['', 'argon2id', 'v=19', 'm=...,t=...,p=...', saltB64, hashB64]
    if (parts.length !== 6) return false;

    const paramsPart = parts[3];
    const saltB64 = parts[4];
    const expectedHashB64 = parts[5];

    const paramMap: Record<string, number> = {};
    for (const kv of paramsPart.split(',')) {
      const [k, v] = kv.split('=');
      paramMap[k] = parseInt(v, 10);
    }

    const m = paramMap.m || ARGON2_MEMORY;
    const t = paramMap.t || ARGON2_TIME;
    const p = paramMap.p || ARGON2_PARALLELISM;

    const salt = Buffer.from(saltB64, 'base64url');
    const expectedHash = Buffer.from(expectedHashB64, 'base64url');

    const computed = argon2id(password, salt, {
      m,
      t,
      p,
      dkLen: expectedHash.length,
    });

    const computedBuf = Buffer.from(computed);
    if (computedBuf.length !== expectedHash.length) return false;

    return crypto.timingSafeEqual(computedBuf, expectedHash);
  } catch {
    return false;
  }
}

/**
 * Gera token criptograficamente seguro (256 bits)
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash SHA-256 para persistência segura de tokens de sessão e recuperação no banco
 */
export function hashTokenSha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Valida assinatura HMAC-SHA256 de webhooks (n8n / Radar Quest)
 */
export function verifyWebhookSignature(rawPayload: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac('sha256', env.WEBHOOK_SHARED_SECRET)
    .update(rawPayload)
    .digest('hex');

  const cleanProvided = signatureHeader.replace(/^sha256=/i, '').trim();
  if (cleanProvided.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cleanProvided, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

