import { cleanIdeaSuggestions } from './idea-suggestions-shape.js';

const KEY_PREFIX = 'vydrivo.idea-directions.';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function key(projectId) {
  return `${KEY_PREFIX}${projectId}`;
}

export function loadIdeaSuggestions(projectId, { storage, now = Date.now() } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!projectId || !store) return null;
  try {
    const raw = store.getItem(key(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== 'number' || now - parsed.savedAt > MAX_AGE_MS) {
      store.removeItem(key(projectId));
      return null;
    }
    const suggestions = cleanIdeaSuggestions(parsed.suggestions);
    if (!suggestions.length) {
      store.removeItem(key(projectId));
      return null;
    }
    return {
      suggestions,
      sourceTopic: typeof parsed.sourceTopic === 'string' ? parsed.sourceTopic : '',
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveIdeaSuggestions(projectId, { suggestions, sourceTopic = '' } = {}, { storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!projectId || !store || !Array.isArray(suggestions)) return;
  const clean = cleanIdeaSuggestions(suggestions);
  if (!clean.length) return;
  try {
    store.setItem(key(projectId), JSON.stringify({
      suggestions: clean,
      sourceTopic: String(sourceTopic || ''),
      savedAt: Date.now(),
    }));
  } catch {
    // Storage can be full or unavailable; suggestions still work for this view.
  }
}

export function clearIdeaSuggestions(projectId, { storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!projectId || !store) return;
  try {
    store.removeItem(key(projectId));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
