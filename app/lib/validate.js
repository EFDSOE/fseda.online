import { HttpError } from './http.js';

export function text(body, field, { min = 0, max = 200, optional = false, trim = true } = {}) {
  let value = body[field];
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw new HttpError(400, 'validation', field);
  }
  if (typeof value !== 'string') throw new HttpError(400, 'validation', field);
  if (trim) value = value.trim();
  if (value.length < min || value.length > max) throw new HttpError(400, 'validation', field);
  return value;
}

export function oneOf(body, field, allowed, { optional = false } = {}) {
  const value = body[field];
  if (value === undefined && optional) return undefined;
  if (!allowed.includes(value)) throw new HttpError(400, 'validation', field);
  return value;
}

export function int(body, field, { min = 0, max = 100000, optional = false } = {}) {
  const value = body[field];
  if (value === undefined && optional) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, 'validation', field);
  return n;
}

export function bool(body, field, { optional = false } = {}) {
  const value = body[field];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'boolean') throw new HttpError(400, 'validation', field);
  return value;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function email(body, field = 'email') {
  const value = text(body, field, { min: 3, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(value)) throw new HttpError(400, 'validation', field);
  return value;
}

export const PASSWORD_MIN = 10;

export function password(body, field = 'password') {
  const value = body[field];
  if (typeof value !== 'string') throw new HttpError(400, 'validation', field);
  if (value.length < PASSWORD_MIN) throw new HttpError(400, 'weak_password', field);
  if (value.length > 200) throw new HttpError(400, 'validation', field);
  return value;
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input) {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'kurs';
}

export function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, 'not_found');
  return n;
}
