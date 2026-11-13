import assert from 'node:assert/strict';
import test from 'node:test';
import { storyboardRequest } from './storyboard-client.js';

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

test('storyboard requests send the body with a CSRF token', async () => {
  let request;
  const data = { storyboard: { title: 'Draft', scenes: [] } };
  const result = await withFetch(async (url, options) => {
    if (String(url) === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: 'csrf-token' } });
    request = { url: String(url), options };
    return jsonResponse({ data });
  }, () => storyboardRequest('POST', { topic: 'The water cycle' }));

  assert.equal(request.url, '/api/v1/storyboards');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['X-CSRF-Token'], 'csrf-token');
  assert.match(request.options.headers['Idempotency-Key'], /^[A-Za-z0-9_-]{16,128}$/);
  assert.deepEqual(JSON.parse(request.options.body), { topic: 'The water cycle' });
  assert.deepEqual(result, data);
});

test('storyboard request failures keep the server message', async () => {
  await withFetch(async (url) => {
    if (String(url) === '/api/v1/auth/csrf') return jsonResponse({ data: { csrfToken: 'csrf-token' } });
    return jsonResponse({ error: { message: 'Fix the storyboard first.' } }, 422);
  }, async () => {
    await assert.rejects(
      () => storyboardRequest('POST', {}),
      (error) => error instanceof Error && error.message === 'Fix the storyboard first.',
    );
  });
});
