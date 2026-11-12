export class ApiError extends Error {
  constructor(status, code, field) {
    super(code);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'X-Requested-With': 'fseda', Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Nginx 502/504 pages are HTML, not JSON.
  }
  if (!res.ok) {
    const fallback = res.status >= 500 ? 'server' : 'unknown';
    throw new ApiError(res.status, data?.error || fallback, data?.field);
  }
  return data;
}
