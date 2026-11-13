import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProject,
  isProjectConflict,
  ProjectRequestError,
  saveProjectStoryboard,
  suggestIdeas,
  updateProject,
} from './projects-client.js';

const TOKEN = '2026-11-04T07:12:33.123456+00:00';

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function csrfResponse() {
  return jsonResponse({ data: { csrfToken: 'csrf-token' } });
}

test('project writes send the loaded version token', async () => {
  const calls = [];
  await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    return jsonResponse({ data: { project: { id: 'p1', updatedAt: TOKEN } } });
  }, async () => {
    await updateProject('p1', { title: 'Mine' }, { baseUpdatedAt: TOKEN });
    await saveProjectStoryboard('p1', { storyboard: null, approved: false, baseUpdatedAt: TOKEN });
  });

  const patch = calls.find((call) => call.options.method === 'PATCH');
  const put = calls.find((call) => call.options.method === 'PUT');
  assert.equal(JSON.parse(patch.options.body).baseUpdatedAt, TOKEN);
  assert.equal(JSON.parse(put.options.body).baseUpdatedAt, TOKEN);
  assert.equal(patch.options.headers['X-CSRF-Token'], 'csrf-token');
  assert.equal(put.options.headers['X-CSRF-Token'], 'csrf-token');
});

test('project writes refuse to run without a version token', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return csrfResponse();
  }, async () => {
    await assert.rejects(
      () => saveProjectStoryboard('p1', { storyboard: null, approved: false }),
      (error) => error instanceof ProjectRequestError
        && error.status === 428
        && error.code === 'PROJECT_VERSION_REQUIRED',
    );
    await assert.rejects(
      () => updateProject('p1', { title: 'Mine' }),
      (error) => error instanceof ProjectRequestError
        && error.status === 428
        && error.code === 'PROJECT_VERSION_REQUIRED',
    );
  });

  assert.equal(calls, 0);
});

test('a 409 is exposed as a typed project conflict with the current project', async () => {
  const current = { id: 'p1', title: 'Saved elsewhere', updatedAt: TOKEN };

  await withFetch(async (url) => {
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    return jsonResponse({
      error: {
        code: 'PROJECT_CONFLICT',
        message: 'This project changed somewhere else.',
        details: { project: current },
      },
    }, 409);
  }, async () => {
    await assert.rejects(
      () => updateProject('p1', { title: 'Mine' }, { baseUpdatedAt: '2026-11-04T06:00:00.000Z' }),
      (error) => error instanceof ProjectRequestError
        && isProjectConflict(error)
        && error.status === 409
        && error.code === 'PROJECT_CONFLICT'
        && error.details.project.title === 'Saved elsewhere',
    );
  });
});

test('non-conflict failures stay ordinary project errors', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    return jsonResponse({ error: { code: 'PROJECT_VERSION_REQUIRED', message: 'Reload the project.' } }, 428);
  }, async () => {
    await assert.rejects(
      () => updateProject('p1', { title: 'Mine' }, { baseUpdatedAt: TOKEN }),
      (error) => error instanceof ProjectRequestError
        && !isProjectConflict(error)
        && error.status === 428
        && error.code === 'PROJECT_VERSION_REQUIRED',
    );
  });
});

test('project create and idea requests send distinct idempotency keys', async () => {
  const calls = [];
  await withFetch(async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    if (String(url) === '/api/v1/projects') return jsonResponse({ data: { project: { id: 'p1' } } }, 201);
    return jsonResponse({ data: { suggestions: [] } });
  }, async () => {
    await createProject({ title: 'Title', topic: 'Topic' });
    await suggestIdeas('p1', { topic: 'Topic' });
  });

  const create = calls.find((call) => call.url === '/api/v1/projects');
  const ideas = calls.find((call) => call.url.includes('/ideas'));
  assert.match(create.options.headers['Idempotency-Key'], /^[A-Za-z0-9_-]{16,128}$/);
  assert.match(ideas.options.headers['Idempotency-Key'], /^[A-Za-z0-9_-]{16,128}$/);
  assert.notEqual(create.options.headers['Idempotency-Key'], ideas.options.headers['Idempotency-Key']);
});
