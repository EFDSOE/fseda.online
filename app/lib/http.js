export class HttpError extends Error {
  constructor(status, code, field) {
    super(code);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function sendJson(res, status, data, extraHeaders = {}) {
  const body = status === 204 ? '' : JSON.stringify(data ?? {});
  res.writeHead(status, { ...API_HEADERS, ...extraHeaders });
  res.end(body);
}

export async function readJson(req, limitBytes = 1_000_000) {
  const type = req.headers['content-type'] || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type');
  }
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > limitBytes) throw new HttpError(413, 'payload_too_large');

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new HttpError(413, 'payload_too_large');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'invalid_json');
  }
  return parsed;
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export function serializeCookie(name, value, { maxAge, secure, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge !== undefined) cookie += `; Max-Age=${Math.floor(maxAge)}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  return cookie;
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// Behind Nginx the socket address is always loopback; the real client address
// is in X-Real-IP. Only trust that header when the request came from loopback.
export function clientIp(req) {
  const remote = req.socket.remoteAddress || '';
  if (LOOPBACK.has(remote)) {
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.length < 64) return real.trim();
  }
  return remote;
}

export function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' && LOOPBACK.has(req.socket.remoteAddress || '');
}

// Tiny router: patterns like "/api/courses/:slug/lessons/:id".
export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const keys = [];
    const source = pattern
      .split('/')
      .map((seg) => {
        if (seg.startsWith(':')) {
          keys.push(seg.slice(1));
          return '([^/]+)';
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    this.routes.push({ method, regex: new RegExp(`^${source}/?$`), keys, handler });
  }

  match(method, pathname) {
    let pathMatched = false;
    for (const route of this.routes) {
      const m = route.regex.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        try {
          params[key] = decodeURIComponent(m[i + 1]);
        } catch {
          params[key] = m[i + 1];
        }
      });
      return { handler: route.handler, params };
    }
    return { handler: null, pathMatched };
  }
}
