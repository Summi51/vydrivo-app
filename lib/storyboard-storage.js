export const STORYBOARD_KEY = 'vydrivo.storyboard-draft';

export function storyboardKey(projectId) {
  return projectId ? `${STORYBOARD_KEY}:${projectId}` : STORYBOARD_KEY;
}

export function readStoryboard(storage, projectId) {
  const raw = storage.getItem(storyboardKey(projectId));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.storyboard?.scenes) || !parsed.storyboard.scenes.length) return null;
  return parsed;
}

export function saveStoryboard(storage, value, projectId) {
  storage.setItem(storyboardKey(projectId), JSON.stringify(value));
  return value;
}

export function removeStoryboard(storage, projectId) {
  storage.removeItem(storyboardKey(projectId));
}
