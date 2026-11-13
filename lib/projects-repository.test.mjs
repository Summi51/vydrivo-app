import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProject,
  deleteProject,
  isProjectVersion,
  listProjects,
  mapProject,
  ProjectConflictError,
  ProjectRepositoryError,
  updateProject,
  validateProjectInput,
} from './projects-repository.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
};

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  owner_id: '22222222-2222-4222-8222-222222222222',
  title: 'A quiet launch',
  topic: 'A quiet product launch.',
  audience: 'Independent creators',
  notes: 'Keep the tone calm.',
  voice_preset: 'daniel-test',
  format: 'Talking head / explainer',
  format_id: 'talking-head',
  target_seconds: 90,
  target_label: '60–90s',
  aspect: '9:16',
  storyboard: null,
  review_approved: false,
  storyboard_hash: null,
  status: 'draft',
  created_at: '2026-10-25T00:00:00.000Z',
  updated_at: '2026-10-25T00:00:00.000Z',
};

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('validates project create and partial update fields', () => {
  const created = validateProjectInput({ title: 'A quiet launch', topic: 'A quiet product launch.' });
  assert.equal(created.ok, true);
  assert.equal(created.value.aspect, '9:16');
  assert.equal(created.value.targetSeconds, 90);
  assert.equal(validateProjectInput({ title: 'Only title' }).ok, false);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', targetSeconds: 30 }).ok, false);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', aspect: '4:3' }).ok, false);
  assert.equal(validateProjectInput({}, { partial: true }).ok, false);
  assert.equal(validateProjectInput({ ownerId: 'nope' }).ok, false);
  assert.equal(validateProjectInput({ status: 'planning' }, { partial: true }).ok, true);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', storyboard: { huge: 'x'.repeat(256 * 1024) } }).ok, false);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', audience: 'x'.repeat(501) }).ok, false);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', notes: 'line one\nline two' }).ok, true);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', voicePreset: 'not-a-voice' }).ok, false);
  assert.equal(validateProjectInput({ title: 'Title', topic: 'Topic', voicePreset: 'indian-english-female' }).ok, true);
});

test('creates a project with the user bearer token and maps the row', async () => {
  let request;
  const result = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify([row]), { status: 201, headers: { 'content-type': 'application/json' } });
  }, () => createProject('access-token', { title: row.title, topic: row.topic }, { env }));

  assert.equal(request.url, 'https://example.supabase.co/rest/v1/projects');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(request.options.headers.Authorization, 'Bearer access-token');
  const posted = JSON.parse(request.options.body);
  assert.equal(posted.owner_id, undefined);
  assert.equal(posted.audience, '');
  assert.equal(posted.notes, '');
  assert.equal(posted.voice_preset, 'daniel-test');
  assert.equal(result.id, row.id);
  assert.equal(result.review.approved, false);
  assert.equal(result.audience, 'Independent creators');
  assert.equal(result.notes, 'Keep the tone calm.');
  assert.equal(result.voicePreset, 'daniel-test');
  assert.equal(result.persistence, 'postgres');
});

test('lists projects with pagination and returns a total', async () => {
  let request;
  const result = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify([row]), {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': '0-0/1' },
    });
  }, () => listProjects('access-token', { limit: 1, offset: 0, env }));

  assert.match(request.url, /\/rest\/v1\/projects\?/);
  assert.match(request.url, /limit=1/);
  assert.equal(result.projects.length, 1);
  assert.equal(result.pagination.total, 1);
  assert.equal(result.pagination.nextOffset, 1);
});

test('updates and deletes a project', async () => {
  const calls = [];
  await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === 'PATCH') {
      return new Response(JSON.stringify([{ ...row, title: 'Renamed' }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify([{ id: row.id }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }, async () => {
    const updated = await updateProject('access-token', row.id, { title: 'Renamed' }, { env });
    assert.equal(updated.title, 'Renamed');
    assert.equal(await deleteProject('access-token', row.id, { env }), true);
  });
  assert.equal(calls[0].options.method, 'PATCH');
  assert.match(calls[0].url, /id=eq\./);
  assert.equal(calls[1].options.method, 'DELETE');
});

test('deleting a missing project returns a safe 404', async () => {
  await withFetch(async () => new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }), async () => {
    await assert.rejects(
      () => deleteProject('access-token', row.id, { env }),
      (error) => error instanceof ProjectRepositoryError && error.status === 404,
    );
  });
});

test('updates only when the sent project version still matches', async () => {
  let patchUrl;
  const saved = await withFetch(async (url, options) => {
    patchUrl = String(url);
    return new Response(JSON.stringify([{ ...row, title: 'Renamed', updated_at: '2026-10-25T00:00:05.123456+00:00' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }, () => updateProject('access-token', row.id, { title: 'Renamed' }, {
    env,
    baseUpdatedAt: row.updated_at,
  }));

  assert.match(patchUrl, /updated_at=eq\.2026-10-25T00%3A00%3A00\.000Z/);
  assert.equal(saved.title, 'Renamed');
  assert.equal(saved.updatedAt, '2026-10-25T00:00:05.123456+00:00');
});

test('a stale project version returns 409 with the current server project', async () => {
  const current = { ...row, title: 'Saved in another tab', updated_at: '2026-10-25T00:00:09.000001+00:00' };
  let patches = 0;
  await withFetch(async (url, options) => {
    if (options.method === 'PATCH') {
      patches += 1;
      return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.match(String(url), /id=eq\./);
    return new Response(JSON.stringify([current]), { status: 200, headers: { 'content-type': 'application/json' } });
  }, async () => {
    await assert.rejects(
      () => updateProject('access-token', row.id, { title: 'Mine' }, { env, baseUpdatedAt: row.updated_at }),
      (error) => error instanceof ProjectConflictError
        && error.status === 409
        && error.code === 'PROJECT_CONFLICT'
        && error.project.title === 'Saved in another tab',
    );
  });
  assert.equal(patches, 1);
});

test('a stale version on a deleted project returns 404, not a conflict', async () => {
  await withFetch(async (url, options) => {
    if (options.method === 'PATCH') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
  }, async () => {
    await assert.rejects(
      () => updateProject('access-token', row.id, { title: 'Mine' }, { env, baseUpdatedAt: row.updated_at }),
      (error) => error instanceof ProjectRepositoryError && error.status === 404 && error.code === 'PROJECT_NOT_FOUND',
    );
  });
});

test('rejects a malformed version before writing', async () => {
  let called = false;
  await withFetch(async () => {
    called = true;
    return new Response('[]', { status: 200 });
  }, async () => {
    await assert.rejects(
      () => updateProject('access-token', row.id, { title: 'Mine' }, { env, baseUpdatedAt: 'yesterday' }),
      (error) => error instanceof ProjectRepositoryError && error.status === 422 && error.code === 'PROJECT_VERSION_INVALID',
    );
  });
  assert.equal(called, false);
});

test('accepts PostgREST and ISO version tokens only', () => {
  assert.equal(isProjectVersion('2026-10-25T00:00:00.000Z'), true);
  assert.equal(isProjectVersion('2026-11-04T07:12:33.123456+00:00'), true);
  assert.equal(isProjectVersion('2026-11-04T07:12:33+00:00'), true);
  assert.equal(isProjectVersion('2026-11-04T07:12:33.123456+05:30'), true);
  assert.equal(isProjectVersion('2026-11-04T07:12:33'), false);
  assert.equal(isProjectVersion(''), false);
  assert.equal(isProjectVersion(null), false);
});

test('maps storage errors without leaking provider details', async () => {
  await withFetch(async () => new Response(JSON.stringify({ message: 'permission denied for table projects', details: 'secret' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  }), async () => {
    await assert.rejects(
      () => createProject('access-token', { title: row.title, topic: row.topic }, { env }),
      (error) => error instanceof ProjectRepositoryError && error.status === 401 && error.code === 'AUTH_REQUIRED',
    );
  });
});

test('requires a configured storage URL and key', async () => {
  await assert.rejects(
    () => createProject('access-token', { title: row.title, topic: row.topic }, { env: {} }),
    (error) => error instanceof ProjectRepositoryError && error.code === 'PROJECT_STORAGE_UNAVAILABLE',
  );
});

test('mapProject normalizes nullable review fields', () => {
  const project = mapProject({ ...row, storyboard_hash: null });
  assert.equal(project.review.storyboardHash, '');
  assert.equal(project.storyboard, null);
});
