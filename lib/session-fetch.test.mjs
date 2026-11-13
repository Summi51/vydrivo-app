import assert from 'node:assert/strict';
import test from 'node:test';
import { apiRequest, refreshSession } from './session-fetch.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('a 401 refreshes the session and retries with a new CSRF token', async () => {
  const calls = [];
  let projectCalls = 0;
  await withFetch(async (url, options = {}) => {
    const path = String(url);
    calls.push({ path, method: options.method || 'GET', headers: options.headers || {} });
    if (path === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: `csrf-${calls.length}` } });
    if (path === '/api/v1/auth/refresh') return jsonResponse({ data: { csrfToken: 'csrf-refresh' } });
    if (path === '/api/v1/projects/p1') {
      projectCalls += 1;
      return projectCalls === 1 ? jsonResponse({ error: { code: 'AUTH_REQUIRED' } }, 401) : jsonResponse({ data: { ok: true } });
    }
    throw new Error(`Unexpected request: ${path}`);
  }, async () => {
    const response = await apiRequest('/api/v1/projects/p1', { method: 'PATCH', body: { title: 'Mine' } });
    assert.equal(response.status, 200);
  });

  const writes = calls.filter((call) => call.path === '/api/v1/projects/p1');
  assert.equal(writes.length, 2);
  assert.equal(writes[0].headers['X-CSRF-Token'], 'csrf-1');
  assert.equal(writes[1].headers['X-CSRF-Token'], 'csrf-refresh');
  assert.equal(calls.filter((call) => call.path === '/api/v1/auth/csrf').length, 2);
  assert.equal(calls.filter((call) => call.path === '/api/v1/auth/refresh').length, 1);
});

test('a non-401 response never refreshes', async () => {
  const calls = [];
  await withFetch(async (url) => {
    calls.push(String(url));
    return jsonResponse({ data: { ok: true } });
  }, async () => {
    const response = await apiRequest('/api/v1/projects');
    assert.equal(response.status, 200);
  });

  assert.deepEqual(calls, ['/api/v1/projects']);
});

test('returns the original 401 when the refresh fails', async () => {
  const calls = [];
  await withFetch(async (url) => {
    const path = String(url);
    calls.push(path);
    if (path === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: 'csrf' } });
    if (path === '/api/v1/auth/refresh') return jsonResponse({ error: { code: 'SESSION_EXPIRED' } }, 401);
    return jsonResponse({ error: { code: 'AUTH_REQUIRED' } }, 401);
  }, async () => {
    const response = await apiRequest('/api/v1/projects');
    assert.equal(response.status, 401);
  });

  assert.equal(calls.filter((path) => path === '/api/v1/projects').length, 1);
  assert.equal(calls.filter((path) => path === '/api/v1/auth/refresh').length, 1);
});

test('concurrent callers share one in-flight refresh', async () => {
  let releaseRefresh;
  const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
  let refreshCalls = 0;

  await withFetch(async (url) => {
    const path = String(url);
    if (path === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: 'csrf' } });
    if (path === '/api/v1/auth/refresh') {
      refreshCalls += 1;
      await refreshGate;
      return jsonResponse({ data: { csrfToken: 'csrf-refresh' } });
    }
    throw new Error(`Unexpected request: ${path}`);
  }, async () => {
    const first = refreshSession();
    const second = refreshSession();
    releaseRefresh();
    assert.equal(await first, true);
    assert.equal(await second, true);
  });

  assert.equal(refreshCalls, 1);
});

test('a failed refresh reports false and clears for the next attempt', async () => {
  await withFetch(async (url) => {
    if (String(url) === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: 'csrf' } });
    throw new Error('network down');
  }, async () => {
    assert.equal(await refreshSession(), false);
  });

  await withFetch(async (url) => {
    if (String(url) === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: 'csrf' } });
    if (String(url) === '/api/v1/auth/refresh') return jsonResponse({ data: { csrfToken: 'csrf-refresh' } });
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    assert.equal(await refreshSession(), true);
  });
});
