import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMediaUploadIntent,
  deleteMediaAsset,
  getMediaAccessUrl,
  listMediaAssets,
  MediaRequestError,
  uploadReferenceFile,
} from './media-client.js';

const projectId = '22222222-2222-4222-8222-222222222222';
const assetId = '44444444-4444-4444-8444-444444444444';
const key = `users/11111111-1111-4111-8111-111111111111/projects/${projectId}/reference/55555555-5555-4555-8555-555555555555.png`;
const quota = { usedBytes: 70, limitBytes: 500 * 1024 * 1024, remainingBytes: 500 * 1024 * 1024 - 70 };

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

test('requests an upload intent with the CSRF header and file metadata', async () => {
  const calls = [];
  await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    return jsonResponse({ data: { assetId, key, method: 'PUT', uploadUrl: 'https://s3.example/upload', headers: { 'Content-Type': 'image/png' } } }, 201);
  }, () => createMediaUploadIntent({
    projectId,
    mime: 'image/png',
    bytes: 70,
    filename: 'frame.png',
  }));

  const intent = calls.find((call) => call.url.includes('/media/upload-intents'));
  assert.equal(intent.options.headers['X-CSRF-Token'], 'csrf-token');
  const body = JSON.parse(intent.options.body);
  assert.equal(body.projectId, projectId);
  assert.equal(body.filename, 'frame.png');
  assert.equal(body.bytes, 70);
});

test('uploads and finalizes a reference file in order', async () => {
  const stages = [];
  const calls = [];
  const file = new File([new Uint8Array(70)], 'frame.png', { type: 'image/png' });

  const result = await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    if (String(url).includes('/media/upload-intents')) {
      return jsonResponse({ data: { assetId, key, method: 'PUT', uploadUrl: 'https://s3.example/upload', headers: { 'Content-Type': 'image/png' } } }, 201);
    }
    if (String(url) === 'https://s3.example/upload') return new Response(null, { status: 200 });
    if (String(url).includes(`/media/assets/${assetId}/finalize`)) {
      return jsonResponse({ data: { asset: { id: assetId, status: 'validated', key, filename: 'frame.png' }, quota } });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, () => uploadReferenceFile(file, { projectId, onStage: (stage) => stages.push(stage) }));

  assert.deepEqual(stages, ['preparing', 'uploading', 'checking']);
  assert.equal(result.asset.status, 'validated');
  assert.equal(result.quota.usedBytes, 70);

  const put = calls.find((call) => call.url === 'https://s3.example/upload');
  assert.equal(put.options.method, 'PUT');
  assert.equal(put.options.headers['Content-Type'], 'image/png');
  assert.equal(put.options.body, file);

  const finalize = calls.find((call) => call.url.includes('/finalize'));
  assert.equal(finalize.options.headers['X-CSRF-Token'], 'csrf-token');
});

test('rejects an unsupported file before any request', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return csrfResponse();
  }, async () => {
    await assert.rejects(
      () => uploadReferenceFile({ type: 'image/gif', size: 10, name: 'frame.gif' }, { projectId }),
      (error) => error instanceof MediaRequestError && error.code === 'INVALID_MEDIA_FILE',
    );
  });
  assert.equal(calls, 0);
});

test('lists assets and requests a signed preview URL', async () => {
  const calls = [];
  const data = await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    if (String(url).includes('/media/assets?')) {
      return jsonResponse({ data: { assets: [{ id: assetId, key, status: 'validated' }], quota } });
    }
    if (String(url).includes('/media/access')) {
      return jsonResponse({ data: { url: 'https://s3.example/signed', expiresAt: '2026-11-06T10:05:00.000Z' } });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    const list = await listMediaAssets(projectId);
    const access = await getMediaAccessUrl(key);
    return { list, access };
  });

  assert.equal(data.list.assets.length, 1);
  assert.equal(data.list.quota.usedBytes, 70);
  assert.equal(data.access.url, 'https://s3.example/signed');

  const listCall = calls.find((call) => call.url.includes('/media/assets?'));
  assert.equal(listCall.options.method, 'GET');
  assert.match(listCall.url, new RegExp(`projectId=${projectId}`));
  const accessCall = calls.find((call) => call.url.includes('/media/access'));
  assert.equal(JSON.parse(accessCall.options.body).key, key);
});

test('deletes an asset with a CSRF-protected request', async () => {
  const calls = [];
  await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    return jsonResponse({ data: { deleted: true, quota } });
  }, () => deleteMediaAsset(assetId));

  const deletion = calls.find((call) => call.url.includes(`/media/assets/${assetId}`));
  assert.equal(deletion.options.method, 'DELETE');
  assert.equal(deletion.options.headers['X-CSRF-Token'], 'csrf-token');
});

test('surfaces a typed media error from the API', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('/auth/csrf')) return csrfResponse();
    return jsonResponse({ error: { code: 'MEDIA_QUOTA_EXCEEDED', message: 'This upload would exceed the limit.' } }, 413);
  }, async () => {
    await assert.rejects(
      () => createMediaUploadIntent({ projectId, mime: 'image/png', bytes: 70 }),
      (error) => error instanceof MediaRequestError
        && error.status === 413
        && error.code === 'MEDIA_QUOTA_EXCEEDED',
    );
  });
});
