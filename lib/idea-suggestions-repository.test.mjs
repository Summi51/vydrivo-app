import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getIdeaSuggestions,
  IdeaSuggestionsError,
  saveIdeaSuggestions,
} from './idea-suggestions-repository.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
};

const suggestions = [
  {
    title: 'The desk and the filing cabinet',
    hook: 'Your computer forgets everything when the power goes off.',
    angle: 'Use a desk for active work and a filing cabinet for long-term storage.',
    outline: ['Open with a messy desk', 'Show active work', 'Move finished work'],
    visualDirection: 'Warm overhead desk scene.',
    sampleScenePrompt: 'Slow top-down push-in on a wooden desk, warm light, 9:16, 5 seconds.',
  },
];

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('loads saved directions with the user bearer token', async () => {
  let request;
  const result = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify([{ suggestions: [suggestions[0], { title: 'Broken' }], source_topic: 'Explain RAM', updated_at: '2026-11-05T10:00:00.000Z' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }, () => getIdeaSuggestions('access-token', 'project-1', { env }));

  assert.match(request.url, /\/rest\/v1\/project_idea_suggestions\?/);
  assert.match(request.url, /project_id=eq\.project-1/);
  assert.equal(request.options.headers.Authorization, 'Bearer access-token');
  assert.equal(result.available, true);
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.sourceTopic, 'Explain RAM');
  assert.equal(result.savedAt, '2026-11-05T10:00:00.000Z');
});

test('treats a missing suggestions table as an unavailable optional store', async () => {
  const result = await withFetch(async () => new Response(JSON.stringify({ code: '42P01', message: 'relation does not exist' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  }), () => getIdeaSuggestions('access-token', 'project-1', { env }));

  assert.deepEqual(result, { available: false, suggestions: [], sourceTopic: '', savedAt: null });
});

test('upserts the latest directions without touching the project row', async () => {
  let request;
  const saved = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return new Response(null, { status: 201 });
  }, () => saveIdeaSuggestions('access-token', 'project-1', {
    suggestions,
    sourceTopic: 'Explain RAM',
  }, { env }));

  assert.equal(saved, true);
  assert.match(request.url, /on_conflict=project_id/);
  assert.equal(request.options.method, 'POST');
  assert.match(request.options.headers.Prefer, /resolution=merge-duplicates/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.project_id, 'project-1');
  assert.equal(body.suggestions.length, 1);
  assert.equal(body.source_topic, 'Explain RAM');
  assert.equal(body.owner_id, undefined);
});

test('a missing table makes the optional save return false', async () => {
  const saved = await withFetch(async () => new Response(JSON.stringify({ code: '42P01' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  }), () => saveIdeaSuggestions('access-token', 'project-1', { suggestions }, { env }));

  assert.equal(saved, false);
});

test('requires an access token and configured storage', async () => {
  await assert.rejects(
    () => getIdeaSuggestions('', 'project-1', { env }),
    (error) => error instanceof IdeaSuggestionsError && error.status === 401,
  );
  await assert.rejects(
    () => getIdeaSuggestions('access-token', 'project-1', { env: {} }),
    (error) => error instanceof IdeaSuggestionsError && error.status === 503,
  );
});
