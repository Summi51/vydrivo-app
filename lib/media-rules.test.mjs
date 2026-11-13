import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanMediaFilename,
  formatMediaBytes,
  validateMediaIntent,
} from './media-rules.js';
import { validateReferenceFile } from './media-upload.js';

const projectId = '22222222-2222-4222-8222-222222222222';

test('validates reference and thumbnail intents by type and size', () => {
  assert.equal(validateMediaIntent({ projectId, kind: 'reference', mime: 'image/png', bytes: 70 }).ok, true);
  assert.equal(validateMediaIntent({ projectId, kind: 'thumbnail', mime: 'image/jpeg', bytes: 1024 }).ok, true);
  assert.equal(validateMediaIntent({ projectId, kind: 'thumbnail', mime: 'video/mp4', bytes: 1024 }).ok, false);
  assert.equal(validateMediaIntent({ projectId, kind: 'reference', mime: 'image/gif', bytes: 1024 }).ok, false);
  assert.equal(validateMediaIntent({ projectId, kind: 'reference', mime: 'video/mp4', bytes: 0 }).ok, false);
  assert.equal(validateMediaIntent({ projectId, kind: 'reference', mime: 'video/mp4', bytes: 100 * 1024 * 1024 + 1 }).ok, false);
  assert.equal(validateMediaIntent({ projectId: 'bad', kind: 'reference', mime: 'image/png', bytes: 1 }).ok, false);
});

test('cleans filenames without allowing paths or control characters', () => {
  assert.equal(cleanMediaFilename('../../etc/passwd'), 'passwd');
  assert.equal(cleanMediaFilename('C:\\Users\\sam\\photo.png'), 'photo.png');
  assert.equal(cleanMediaFilename('  <script>.png  '), 'script.png');
  assert.equal(cleanMediaFilename(''), 'reference');
  assert.equal(cleanMediaFilename('a'.repeat(200)).length, 120);
});

test('formats media sizes for the upload panel', () => {
  assert.equal(formatMediaBytes(0), '0 MB');
  assert.equal(formatMediaBytes(70), '1 KB');
  assert.equal(formatMediaBytes(1024 * 1024), '1 MB');
  assert.equal(formatMediaBytes(20 * 1024 * 1024), '20 MB');
});

test('validates a browser reference file before an intent is requested', () => {
  assert.equal(validateReferenceFile({ type: 'image/png', size: 70, name: 'frame.png' }, projectId).ok, true);
  assert.equal(validateReferenceFile({ type: 'image/gif', size: 70, name: 'frame.gif' }, projectId).ok, false);
  assert.equal(validateReferenceFile({ type: 'video/mp4', size: 101 * 1024 * 1024, name: 'clip.mp4' }, projectId).ok, false);
  assert.match(
    validateReferenceFile({ type: 'image/png', size: 21 * 1024 * 1024, name: 'huge.png' }, projectId).error,
    /too large/,
  );
});
