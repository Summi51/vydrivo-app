import assert from 'node:assert/strict';
import test from 'node:test';
import { draftFromTopic, readDraft, removeDraft, saveDraft } from './project-draft.js';

test('draft keeps a trimmed topic and refuses empty input', () => {
  const draft = draftFromTopic('  Why do we dream?  ');
  assert.equal(draft.ok, true);
  assert.equal(draft.draft.topic, 'Why do we dream?');
  assert.equal(draft.draft.persistence, 'browser-only');
  assert.equal(draftFromTopic('   ').ok, false);
});

test('draft round-trips in storage and rejects a bad record', () => {
  const memory = new Map();
  const storage = {
    setItem: (key, value) => memory.set(key, value),
    getItem: (key) => memory.get(key) ?? null,
  };
  saveDraft(storage, draftFromTopic('A slower morning').draft);
  assert.equal(readDraft(storage).title, 'A slower morning');
  memory.set('vydrivo.project-draft', '{"topic":"  "}');
  assert.equal(readDraft(storage), null);
});

test('draft stores planning options within the V1 output bounds', () => {
  const draft = draftFromTopic('A product walkthrough', {
    format: 'Product teaser',
    formatId: 'product-teaser',
    targetSeconds: 120,
    targetLabel: '60–90s',
    aspect: '16:9',
  });
  assert.equal(draft.ok, true);
  assert.equal(draft.draft.format, 'Product teaser');
  assert.equal(draft.draft.formatId, 'product-teaser');
  assert.equal(draft.draft.targetSeconds, 90);
  assert.equal(draft.draft.targetLabel, '60–90s');
  assert.equal(draft.draft.aspect, '16:9');
  assert.equal(draft.draft.updatedAt, draft.draft.createdAt);
});

test('draft can be removed from storage', () => {
  const memory = new Map();
  const storage = {
    setItem: (key, value) => memory.set(key, value),
    getItem: (key) => memory.get(key) ?? null,
    removeItem: (key) => memory.delete(key),
  };
  saveDraft(storage, draftFromTopic('A quiet launch').draft);
  assert.ok(readDraft(storage));
  removeDraft(storage);
  assert.equal(readDraft(storage), null);
});
