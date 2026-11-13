export const MIN_SCENES = 1;
export const MAX_SCENES = 24;
export const MIN_SCENE_SECONDS = 2;
export const MAX_SCENE_SECONDS = 30;
export const MIN_TOTAL_SECONDS = 60;
export const MAX_TOTAL_SECONDS = 90;
export const MAX_TITLE = 120;
export const MAX_NARRATION = 700;
export const MAX_PROMPT = 2000;
const SAFE_SCENE_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const REFERENCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nextSceneId(scenes) {
  let index = scenes.length + 1;
  let id = `scene-${index}`;
  const used = new Set(scenes.map((scene) => scene.id));
  while (used.has(id)) {
    index += 1;
    id = `scene-${index}`;
  }
  return id;
}

export function createScene(scenes) {
  return {
    id: nextSceneId(scenes),
    title: `Scene ${scenes.length + 1}`,
    narration: '',
    visualKind: 'ai-generated-footage',
    visualPrompt: '',
    estimatedSeconds: 20,
    referenceAssetId: null,
  };
}

export function duplicateScene(scene, scenes) {
  if (!scene) return null;
  return {
    ...scene,
    id: nextSceneId(scenes),
    title: `${scene.title || 'Scene'} copy`.slice(0, MAX_TITLE),
  };
}

function cleanText(value, max, { required = true } = {}) {
  if (typeof value !== 'string') return !required ? '' : null;
  const text = value.trim();
  if (required && !text) return null;
  if (text.length > max || /[\x00-\x1f<>]/.test(text)) return null;
  return text;
}

export function validateStoryboardDraft({ title, scenes }) {
  const errors = [];
  const cleanTitle = cleanText(title, MAX_TITLE);
  if (!cleanTitle) errors.push('Add a storyboard title.');

  if (!Array.isArray(scenes) || scenes.length < MIN_SCENES) {
    errors.push('Add at least one scene.');
  }
  if (Array.isArray(scenes) && scenes.length > MAX_SCENES) {
    errors.push(`Keep the storyboard to ${MAX_SCENES} scenes or fewer.`);
  }

  const ids = new Set();
  let totalSeconds = 0;
  let footageSeconds = 0;

  (Array.isArray(scenes) ? scenes : []).forEach((scene, index) => {
    const number = index + 1;
    if (!scene || typeof scene !== 'object') {
      errors.push(`Scene ${number} is invalid.`);
      return;
    }
    if (typeof scene.id !== 'string' || !SAFE_SCENE_ID.test(scene.id) || ids.has(scene.id)) {
      errors.push(`Scene ${number} needs a unique safe identifier.`);
    } else {
      ids.add(scene.id);
    }
    if (!cleanText(scene.title, MAX_TITLE)) errors.push(`Scene ${number} needs a title.`);
    if (!cleanText(scene.narration, MAX_NARRATION)) errors.push(`Scene ${number} needs narration.`);
    if (!cleanText(scene.visualPrompt, MAX_PROMPT)) errors.push(`Scene ${number} needs a visual intent.`);
    if (
      scene.referenceAssetId !== undefined
      && scene.referenceAssetId !== null
      && (typeof scene.referenceAssetId !== 'string' || !REFERENCE_ID.test(scene.referenceAssetId))
    ) {
      errors.push(`Scene ${number} has an invalid reference.`);
    }
    if (!['ai-generated-footage', 'motion-graphics'].includes(scene.visualKind)) {
      errors.push(`Scene ${number} has an unsupported visual kind.`);
    }
    if (!Number.isFinite(Number(scene.estimatedSeconds)) || Number(scene.estimatedSeconds) < MIN_SCENE_SECONDS || Number(scene.estimatedSeconds) > MAX_SCENE_SECONDS) {
      errors.push(`Scene ${number} must be ${MIN_SCENE_SECONDS}–${MAX_SCENE_SECONDS} seconds.`);
    } else {
      totalSeconds += Number(scene.estimatedSeconds);
      if (scene.visualKind === 'ai-generated-footage') footageSeconds += Number(scene.estimatedSeconds);
    }
  });

  if (Array.isArray(scenes) && scenes.length && (totalSeconds < MIN_TOTAL_SECONDS || totalSeconds > MAX_TOTAL_SECONDS)) {
    errors.push(`Storyboard must total ${MIN_TOTAL_SECONDS}–${MAX_TOTAL_SECONDS} seconds (currently ${totalSeconds}s).`);
  }
  if (Array.isArray(scenes) && scenes.length && footageSeconds < totalSeconds / 2) {
    errors.push('Generated footage must cover at least half of the timeline.');
  }

  return {
    ok: errors.length === 0,
    errors,
    title: cleanTitle || '',
    totalSeconds,
    footageSeconds,
    sceneCount: Array.isArray(scenes) ? scenes.length : 0,
    footagePercent: totalSeconds ? Math.round((footageSeconds / totalSeconds) * 100) : 0,
  };
}
