import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteProject,
  draftFromTopic,
  duplicateProject,
  listProjectSummaries,
  listProjects,
  readDraft,
  saveDraft,
  setCurrentProject,
  updateProject,
} from './project-draft.js';
import { readStoryboard, removeStoryboard, saveStoryboard } from './storyboard-storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function project(storage, topic, formatId = 'talking-head') {
  const result = draftFromTopic(topic, { formatId, format: formatId, targetSeconds: 90, targetLabel: '60–90s' });
  assert.equal(result.ok, true);
  return saveDraft(storage, result.draft);
}

const board = (title) => ({
  storyboard: {
    schemaVersion: 1,
    title,
    scenes: [{ id: 'scene-1', title: 'Scene', estimatedSeconds: 75 }],
  },
  review: { approved: false, storyboardHash: 'hash' },
  sceneCount: 1,
  seconds: 75,
});

test('saveDraft builds a stable browser-tab project collection', () => {
  const storage = memoryStorage();
  const first = project(storage, 'How teams review a storyboard');
  const second = project(storage, 'A product teaser for a launch', 'product-teaser');
  const projects = listProjects(storage);

  assert.equal(projects.length, 2);
  assert.ok(first.id.startsWith('prj_'));
  assert.ok(second.id.startsWith('prj_'));
  assert.equal(new Set(projects.map((item) => item.id)).size, 2);
  assert.equal(readDraft(storage).id, second.id);
});

test('selecting, updating, duplicating and deleting projects stay local', () => {
  const storage = memoryStorage();
  const first = project(storage, 'First project');
  const second = project(storage, 'Second project');

  setCurrentProject(storage, first.id);
  assert.equal(readDraft(storage).id, first.id);

  const updated = updateProject(storage, first.id, { title: 'Renamed project' });
  assert.equal(updated.title, 'Renamed project');
  assert.equal(readDraft(storage).title, 'Renamed project');

  saveStoryboard(storage, board('First board'), first.id);
  const copy = duplicateProject(storage, first.id);
  assert.notEqual(copy.id, first.id);
  assert.match(copy.title, /\(copy\)$/);
  assert.equal(readStoryboard(storage, copy.id).review.approved, false);
  assert.equal(listProjects(storage).length, 3);

  deleteProject(storage, second.id);
  assert.equal(listProjects(storage).length, 2);
  assert.equal(readDraft(storage).id, first.id);
  removeStoryboard(storage, first.id);
  assert.equal(readStoryboard(storage, first.id), null);
});

test('project summaries derive draft, planning and approved states from local storyboards', () => {
  const storage = memoryStorage();
  const draft = project(storage, 'Draft only');
  const planning = project(storage, 'Planning');
  const approved = project(storage, 'Approved');

  saveStoryboard(storage, board('Planning'), planning.id);
  saveStoryboard(storage, {
    ...board('Approved'),
    review: { approved: true, storyboardHash: 'approved-hash' },
  }, approved.id);

  const summaries = listProjectSummaries(storage);
  const byId = new Map(summaries.map((item) => [item.id, item]));
  assert.equal(byId.get(draft.id).state, 'draft');
  assert.equal(byId.get(planning.id).state, 'planning');
  assert.equal(byId.get(approved.id).state, 'approved');
  assert.equal(byId.get(approved.id).seconds, 75);
});
