import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream, statSync } from 'node:fs';
import { openDb } from './lib/db.js';
import { HttpError, sendJson, readJson, parseCookies, clientIp, isHttps } from './lib/http.js';
import { getSessionUser, purgeExpiredSessions, SESSION_COOKIE } from './lib/auth.js';
import { buildRouter, loginLimiter, registerLimiter } from './lib/routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.resolve(here, process.env.DATA_DIR || './data');
// Local development only: serve the built frontend from this process.
// In production Nginx serves the frontend and only /api/ reaches this server.
const STATIC_DIR = process.env.STATIC_DIR ? path.resolve(here, process.env.STATIC_DIR) : null;
// "auto" sets the Secure flag when Nginx reports https; "0" never sets it (local http dev).
const COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'auto';

const db = openDb(DATA_DIR);
const router = buildRouter();

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Cross-site request forgery guard: every state-changing call must carry a custom
// header (browsers only send it cross-origin after a CORS preflight, which we never
// approve) and, when present, an Origin that matches the Host.
function checkCsrf(req) {
  if (SAFE_METHODS.has(req.method)) return;
  if (req.headers['x-requested-with'] !== 'fseda') throw new HttpError(403, 'csrf');
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { throw new HttpError(403, 'csrf'); }
    if (host !== req.headers.host) throw new HttpError(403, 'csrf');
  }
}

async function handleApi(req, res, url) {
  const match = router.match(req.method, url.pathname);
  if (!match.handler) {
    throw new HttpError(match.pathMatched ? 405 : 404, match.pathMatched ? 'method_not_allowed' : 'not_found');
  }
  checkCsrf(req);
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE] || null;
  const ctx = {
    req, res, db, url,
    query: url.searchParams,
    params: match.params,
    token,
    user: getSessionUser(db, token),
    ip: clientIp(req),
    secureCookies: COOKIE_SECURE === 'auto' ? isHttps(req) : COOKIE_SECURE === '1',
    body: () => readJson(req),
  };
  await match.handler(ctx);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { rel = '/'; }
  let file = path.join(STATIC_DIR, path.normalize(rel));
  if (!file.startsWith(STATIC_DIR)) file = path.join(STATIC_DIR, 'index.html');
  let stat;
  try { stat = statSync(file); if (stat.isDirectory()) { file = path.join(file, 'index.html'); stat = statSync(file); } } catch { stat = null; }
  if (!stat) {
    if (rel.startsWith('/assets/')) { res.writeHead(404); res.end(); return; }
    file = path.join(STATIC_DIR, 'index.html'); // SPA fallback, like Nginx try_files
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const started = process.hrtime.bigint();
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      console.log(`${req.method} ${url.pathname} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
  }
  try {
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else if (STATIC_DIR) {
      serveStatic(req, res, url);
    } else {
      throw new HttpError(404, 'not_found');
    }
  } catch (err) {
    if (err instanceof HttpError) {
      if (!res.headersSent) sendJson(res, err.status, { error: err.code, ...(err.field ? { field: err.field } : {}) });
    } else {
      console.error(`[error] ${req.method} ${url.pathname}:`, err);
      if (!res.headersSent) sendJson(res, 500, { error: 'server' });
    }
  }
});

server.headersTimeout = 20_000;
server.requestTimeout = 30_000;

const housekeeping = setInterval(() => {
  try { purgeExpiredSessions(db); } catch (err) { console.error('[housekeeping]', err); }
  loginLimiter.sweep();
  registerLimiter.sweep();
}, 60 * 60 * 1000);
housekeeping.unref();

server.listen(PORT, HOST, () => {
  console.log(`fseda-api listening on http://${HOST}:${PORT} (data: ${DATA_DIR}${STATIC_DIR ? `, static: ${STATIC_DIR}` : ''})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
