import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

const NO_STORE = 'private, no-store';

export function requestId() {
  return `req_${randomBytes(8).toString('hex')}`;
}

export function jsonResult(status, data, { cookies = [], requestId: id = requestId() } = {}) {
  const headers = { 'Cache-Control': NO_STORE, 'X-Request-Id': id };
  const response =
    status === 204
      ? new NextResponse(null, { status, headers })
      : NextResponse.json({ data, meta: { requestId: id } }, { status, headers });
  for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export function errorResult(status, code, message, extra = {}) {
  const id = extra.requestId || requestId();
  const response = NextResponse.json(
    {
      error: { code, message, retryable: status === 429 || status === 503, ...(extra.fields ? { fields: extra.fields } : {}), ...(extra.details ? { details: extra.details } : {}) },
      meta: { requestId: id },
    },
    { status, headers: { 'Cache-Control': NO_STORE, 'X-Request-Id': id, ...(extra.retryAfter ? { 'Retry-After': String(extra.retryAfter) } : {}) } },
  );
  return response;
}

export async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 256 * 1024) return { ok: false, status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large.' };
  const text = await request.text();
  if (!text) return { ok: true, body: {} };
  try {
    const body = JSON.parse(text);
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return { ok: false, status: 400, code: 'MALFORMED_JSON', message: 'Send a JSON object.' };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, status: 400, code: 'MALFORMED_JSON', message: 'Send valid JSON.' };
  }
}

export function allowKeys(body, keys) {
  const unknown = Object.keys(body).filter((key) => !keys.includes(key));
  if (unknown.length) return { ok: false, status: 422, code: 'VALIDATION_FAILED', message: 'Unknown fields were rejected.' };
  return { ok: true };
}

export function redirectResult(location, cookies = []) {
  const response = NextResponse.redirect(location, 303);
  response.headers.set('Cache-Control', NO_STORE);
  for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
