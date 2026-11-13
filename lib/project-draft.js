import { readStoryboard, removeStoryboard, saveStoryboard } from './storyboard-storage.js';

export const DRAFT_KEY = 'vydrivo.project-draft';
export const PROJECTS_KEY = 'vydrivo.projects';
export const PROJECT_LIMIT = 50;
export const TOPIC_LIMIT = 10000;
export const PENDING_TOPIC_KEY = 'vydrivo.pending-topic';

function newProjectId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `prj_${uuid}`;
  return `prj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function legacyProjectId(candidate) {
  const seed = `${candidate?.title || ''}|${candidate?.topic || ''}|${candidate?.createdAt || ''}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return `prj_legacy_${Math.abs(hash).toString(36)}`;
}

function normalizeProject(candidate) {
  const now = new Date().toISOString();
  const title = typeof candidate?.title === 'string' && candidate.title.trim()
    ? candidate.title.trim().slice(0, 120)
    : String(candidate?.topic || '').replace(/\s+/g, ' ').trim().slice(0, 72) || 'Untitled project';
  return {
    ...candidate,
    id: typeof candidate?.id === 'string' && candidate.id.trim() ? candidate.id : legacyProjectId(candidate),
    title,
    topic: String(candidate?.topic || '').trim(),
    createdAt: typeof candidate?.createdAt === 'string' ? candidate.createdAt : now,
    updatedAt: typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : (candidate?.createdAt || now),
    status: typeof candidate?.status === 'string' ? candidate.status : 'draft',
    persistence: 'browser-only',
  };
}

export function draftFromTopic(topic, options = {}) {
  const clean = String(topic || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { ok: false, error: 'Add a topic or a few notes to start.' };
  if (clean.length > TOPIC_LIMIT) return { ok: false, error: 'Keep the topic under 10,000 characters.' };
  const title = clean.length > 72 ? `${clean.slice(0, 69).trimEnd()}...` : clean;
  const format = typeof options.format === 'string' && options.format.trim()
    ? options.format.trim().slice(0, 80)
    : 'Talking head / explainer';
  const formatId = typeof options.formatId === 'string' && options.formatId.trim()
    ? options.formatId.trim().slice(0, 40)
    : 'talking-head';
  const targetSeconds = Number.isFinite(Number(options.targetSeconds))
    ? Math.min(90, Math.max(60, Math.round(Number(options.targetSeconds))))
    : 90;
  const targetLabel = typeof options.targetLabel === 'string' && options.targetLabel.trim()
    ? options.targetLabel.trim().slice(0, 20)
    : `${targetSeconds}s`;
  const aspect = options.aspect === '16:9' ? '16:9' : '9:16';
  const createdAt = new Date().toISOString();
  return {
    ok: true,
    draft: {
      id: newProjectId(),
      title,
      topic: clean,
      format,
      formatId,
      targetSeconds,
      targetLabel,
      aspect,
      createdAt,
      updatedAt: createdAt,
      status: 'draft',
      persistence: 'browser-only',
    },
  };
}

export function listProjects(storage) {
  const raw = storage.getItem(PROJECTS_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item.topic === 'string' && item.topic.trim())
        .map(normalizeProject)
        .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))
        .slice(0, PROJECT_LIMIT);
    } catch {
      return [];
    }
  }
  const current = readDraft(storage);
  return current ? [current] : [];
}

export function upsertProject(storage, project) {
  const normalized = normalizeProject(project);
  const projects = listProjects(storage).filter((item) => item.id !== normalized.id);
  projects.unshift(normalized);
  storage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, PROJECT_LIMIT)));
  return normalized;
}

export function saveDraft(storage, draft) {
  const project = normalizeProject({
    ...draft,
    updatedAt: new Date().toISOString(),
  });
  storage.setItem(DRAFT_KEY, JSON.stringify(project));
  upsertProject(storage, project);
  return project;
}

export function readDraft(storage) {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.topic !== 'string' || !parsed.topic.trim()) return null;
  return normalizeProject(parsed);
}

export function getProject(storage, id) {
  return listProjects(storage).find((project) => project.id === id) || null;
}

export function setCurrentProject(storage, id) {
  const project = getProject(storage, id);
  if (!project) return null;
  storage.setItem(DRAFT_KEY, JSON.stringify(project));
  return project;
}

export function updateProject(storage, id, patch) {
  const current = getProject(storage, id);
  if (!current) return null;
  const project = normalizeProject({
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  });
  upsertProject(storage, project);
  const selected = readDraft(storage);
  if (selected?.id === id) storage.setItem(DRAFT_KEY, JSON.stringify(project));
  return project;
}

export function deleteProject(storage, id) {
  const current = readDraft(storage);
  const projects = listProjects(storage).filter((project) => project.id !== id);
  storage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  if (current?.id === id) storage.removeItem(DRAFT_KEY);
  removeStoryboard(storage, id);
  return true;
}

export function duplicateProject(storage, id) {
  const source = getProject(storage, id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy = normalizeProject({
    ...source,
    id: newProjectId(),
    title: `${source.title} (copy)`.slice(0, 120),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
  });
  upsertProject(storage, copy);
  try {
    const board = readStoryboard(storage, source.id);
    if (board) {
      saveStoryboard(storage, {
        ...board,
        review: {
          ...(board.review || {}),
          approved: false,
        },
      }, copy.id);
    }
  } catch {
    // A corrupt or legacy board should not block duplicating the brief.
  }
  return copy;
}

export function removeDraft(storage) {
  const current = readDraft(storage);
  if (current) {
    const projects = listProjects(storage).filter((project) => project.id !== current.id);
    storage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    removeStoryboard(storage, current.id);
  }
  storage.removeItem(DRAFT_KEY);
}

export function listProjectSummaries(storage) {
  return listProjects(storage).map((project) => {
    let board = null;
    try {
      board = readStoryboard(storage, project.id);
    } catch {
      board = null;
    }
    const sceneCount = Number(board?.sceneCount || board?.storyboard?.scenes?.length || 0);
    const seconds = Number(board?.seconds || 0);
    const stored = ['generating', 'ready', 'failed'].includes(project.status) ? project.status : null;
    const state = stored
      || (board?.review?.approved ? 'approved' : board ? 'planning' : 'draft');
    return {
      ...project,
      state,
      sceneCount,
      seconds,
      reviewed: board?.review?.approved === true,
    };
  });
}
