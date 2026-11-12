import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// scrypt cost: N=2^16 uses ~64 MB per hash. Stored with the hash so it can be raised later.
const SCRYPT = { N: 2 ** 16, r: 8, p: 1, keylen: 64 };
const MAXMEM = 160 * 1024 * 1024;

export const SESSION_COOKIE = 'fseda_sid';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: MAXMEM,
  });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: MAXMEM,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the e-mail does not exist, so a failed login takes as long as a real one.
let dummyHash = null;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('fseda-dummy-password');
  await verifyPassword(password, dummyHash);
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), userId, now + SESSION_TTL_SECONDS, now);
  return token;
}

export function getSessionUser(db, token) {
  if (!token || token.length > 100) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.locale, u.created_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(sha256(token), now);
  return row ?? null;
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function destroyOtherSessions(db, userId, keepToken) {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(userId, sha256(keepToken || ''));
}

export function purgeExpiredSessions(db) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Math.floor(Date.now() / 1000));
}

// Fixed-window limiter kept in memory. Good enough for a single process.
export class RateLimiter {
  constructor({ limit, windowMs }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  // Returns true if the request is allowed.
  take(key) {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  reset(key) {
    this.hits.delete(key);
  }

  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}
