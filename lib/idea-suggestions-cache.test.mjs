import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearIdeaSuggestions,
  loadIdeaSuggestions,
  saveIdeaSuggestions,
} from './idea-suggestions-cache.js';

const suggestion = {
  title: 'The desk and the filing cabinet',
  hook: 'Your computer forgets everything when the power goes off.',
  angle: 'Use a desk for active work and a filing cabinet for long-term storage.',
  outline: ['Open with a messy desk', 'Show active work', 'Move finished work'],
  visualDirection: 'Warm overhead desk scene.',
  sampleScenePrompt: 'Slow top-down push-in on a wooden desk, warm light, 9:16, 5 seconds.',
};

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    size: () => map.size,
  };
}

test('saves and restores the last directions with their source topic', () => {
  const storage = fakeStorage();
  saveIdeaSuggestions('project-1', { suggestions: [suggestion], sourceTopic: 'Explain RAM versus storage' }, { storage });
  const cached = loadIdeaSuggestions('project-1', { storage });

  assert.equal(cached.suggestions.length, 1);
  assert.equal(cached.suggestions[0].title, suggestion.title);
  assert.equal(cached.sourceTopic, 'Explain RAM versus storage');
});

test('filters malformed cached suggestions and removes an empty entry', () => {
  const storage = fakeStorage();
  saveIdeaSuggestions('project-1', { suggestions: [suggestion, { title: 'Broken' }] }, { storage });
  assert.equal(loadIdeaSuggestions('project-1', { storage }).suggestions.length, 1);

  storage.setItem('vydrivo.idea-directions.project-2', JSON.stringify({
    suggestions: [{ title: 'Broken' }],
    savedAt: Date.now(),
  }));
  assert.equal(loadIdeaSuggestions('project-2', { storage }), null);
  assert.equal(storage.size(), 1);
});

test('expires cached directions after seven days', () => {
  const storage = fakeStorage();
  saveIdeaSuggestions('project-1', { suggestions: [suggestion] }, { storage });
  const cached = loadIdeaSuggestions('project-1', {
    storage,
    now: Date.now() + 8 * 24 * 60 * 60 * 1000,
  });
  assert.equal(cached, null);
  assert.equal(storage.size(), 0);
});

test('ignores malformed JSON and unavailable storage', () => {
  const storage = fakeStorage();
  storage.setItem('vydrivo.idea-directions.project-1', '{not-json');
  assert.equal(loadIdeaSuggestions('project-1', { storage }), null);

  assert.equal(loadIdeaSuggestions('project-1', { storage: null }), null);
  assert.doesNotThrow(() => saveIdeaSuggestions('project-1', { suggestions: [suggestion] }, { storage: null }));
});

test('clear removes the cached directions for one project', () => {
  const storage = fakeStorage();
  saveIdeaSuggestions('project-1', { suggestions: [suggestion] }, { storage });
  saveIdeaSuggestions('project-2', { suggestions: [suggestion] }, { storage });
  clearIdeaSuggestions('project-1', { storage });

  assert.equal(loadIdeaSuggestions('project-1', { storage }), null);
  assert.equal(loadIdeaSuggestions('project-2', { storage }).suggestions.length, 1);
});
