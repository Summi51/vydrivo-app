import { supabaseConfig } from './auth-server.js';
import { DEFAULT_VOICE_PRESET, isVoicePreset } from './voice-options.js';

const SELECT_COLUMNS = [
  'id',
  'owner_id',
  'title',
  'topic',
  'audience',
  'notes',
  'voice_preset',
  'format',
  'format_id',
  'target_seconds',
  'target_label',
  'aspect',
  'storyboard',
  'review_approved',
  'storyboard_hash',
  'status',
  'created_at',
  'updated_at',
].join(',');

const ALLOWED_FIELDS = new Set([
  'title',
  'topic',
  'audience',
  'notes',
  'voicePreset',
  'format',
  'formatId',
  'targetSeconds',
  'targetLabel',
  'aspect',
  'storyboard',
  'reviewApproved',
  'storyboardHash',
  'status',
]);

const STATUSES = new Set(['draft', 'planning', 'approved', 'generating', 'ready', 'failed']);
const ASPECTS = new Set(['9:16', '16:9']);
const VERSION_TOKEN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;

export function isProjectVersion(value) {
  return typeof value === 'string' && VERSION_TOKEN.test(value);
}

export class ProjectRepositoryError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ProjectConflictError extends ProjectRepositoryError {
  constructor(project) {
    super(409, 'PROJECT_CONFLICT', 'This project changed somewhere else. Reload the latest version and try again.');
    this.project = project;
  }
}

function requireConfig(env) {
  const config = supabaseConfig(env);
  if (!config.configured) {
    throw new ProjectRepositoryError(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is not configured on this server.');
  }
  return config;
}

function safeText(value, max, required = false) {
  if (value === undefined || value === null) return required ? null : undefined;
  const text = String(value).trim();
  if (required && !text) return null;
  if (text.length > max || /[\x00-\x1f<>]/.test(text)) return null;
  return text;
}

function safeMultiline(value, max) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (text.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(text)) return null;
  return text;
}

export function validateProjectInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Send a project object.' };
  }
  const unknown = Object.keys(input).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknown.length) return { ok: false, error: 'Unknown project fields were rejected.' };
  if (partial && !Object.keys(input).length) return { ok: false, error: 'No project fields were provided.' };

  const result = {};
  if (!partial || input.title !== undefined) {
    const title = safeText(input.title, 120, true);
    if (!title) return { ok: false, error: 'Add a project title.' };
    result.title = title;
  }
  if (!partial || input.topic !== undefined) {
    const topic = safeText(input.topic, 10000, true);
    if (!topic) return { ok: false, error: 'Add a topic or notes.' };
    result.topic = topic;
  }
  if (input.audience !== undefined) {
    const audience = safeText(input.audience, 500);
    if (audience === null) return { ok: false, error: 'Audience must be 500 characters or fewer.' };
    result.audience = audience;
  }
  if (input.notes !== undefined) {
    const notes = safeMultiline(input.notes, 20000);
    if (notes === null) return { ok: false, error: 'Notes must be 20,000 characters or fewer.' };
    result.notes = notes;
  }
  if (input.voicePreset !== undefined) {
    if (!isVoicePreset(input.voicePreset)) return { ok: false, error: 'Choose a supported voice preset.' };
    result.voicePreset = input.voicePreset;
  }
  if (input.format !== undefined) {
    const format = safeText(input.format, 80, true);
    if (!format) return { ok: false, error: 'Add a valid video format.' };
    result.format = format;
  }
  if (input.formatId !== undefined) {
    const formatId = safeText(input.formatId, 40, true);
    if (!formatId) return { ok: false, error: 'Add a valid format identifier.' };
    result.formatId = formatId;
  }
  if (input.targetSeconds !== undefined) {
    const target = Number(input.targetSeconds);
    if (!Number.isInteger(target) || target < 60 || target > 90) {
      return { ok: false, error: 'Target duration must be 60–90 seconds.' };
    }
    result.targetSeconds = target;
  }
  if (input.targetLabel !== undefined) {
    const label = safeText(input.targetLabel, 20, true);
    if (!label) return { ok: false, error: 'Add a valid target label.' };
    result.targetLabel = label;
  }
  if (input.aspect !== undefined) {
    if (!ASPECTS.has(input.aspect)) return { ok: false, error: 'Aspect must be 9:16 or 16:9.' };
    result.aspect = input.aspect;
  }
  if (input.status !== undefined) {
    if (!STATUSES.has(input.status)) return { ok: false, error: 'Unsupported project status.' };
    result.status = input.status;
  }
  if (input.reviewApproved !== undefined) {
    if (typeof input.reviewApproved !== 'boolean') return { ok: false, error: 'Review approval must be true or false.' };
    result.reviewApproved = input.reviewApproved;
  }
  if (input.storyboardHash !== undefined) {
    if (input.storyboardHash !== null && typeof input.storyboardHash !== 'string') {
      return { ok: false, error: 'Storyboard hash must be text or null.' };
    }
    result.storyboardHash = input.storyboardHash;
  }
  if (input.storyboard !== undefined) {
    if (input.storyboard !== null && (typeof input.storyboard !== 'object' || Array.isArray(input.storyboard))) {
      return { ok: false, error: 'Storyboard must be a JSON object or null.' };
    }
    if (input.storyboard !== null) {
      let serialized;
      try { serialized = JSON.stringify(input.storyboard); } catch { serialized = ''; }
      if (!serialized || serialized.length > 256 * 1024) {
        return { ok: false, error: 'Storyboard is too large or is not valid JSON.' };
      }
    }
    result.storyboard = input.storyboard;
  }

  if (!partial) {
    result.title = result.title || result.topic?.slice(0, 72);
    result.audience = result.audience || '';
    result.notes = result.notes || '';
    result.voicePreset = result.voicePreset || DEFAULT_VOICE_PRESET;
    result.format = result.format || 'Talking head / explainer';
    result.formatId = result.formatId || 'talking-head';
    result.targetSeconds = result.targetSeconds || 90;
    result.targetLabel = result.targetLabel || '60–90s';
    result.aspect = result.aspect || '9:16';
    result.status = result.status || 'draft';
  }
  return { ok: true, value: result };
}

function toRow(value) {
  const row = {};
  if (value.title !== undefined) row.title = value.title;
  if (value.topic !== undefined) row.topic = value.topic;
  if (value.audience !== undefined) row.audience = value.audience;
  if (value.notes !== undefined) row.notes = value.notes;
  if (value.voicePreset !== undefined) row.voice_preset = value.voicePreset;
  if (value.format !== undefined) row.format = value.format;
  if (value.formatId !== undefined) row.format_id = value.formatId;
  if (value.targetSeconds !== undefined) row.target_seconds = value.targetSeconds;
  if (value.targetLabel !== undefined) row.target_label = value.targetLabel;
  if (value.aspect !== undefined) row.aspect = value.aspect;
  if (value.storyboard !== undefined) row.storyboard = value.storyboard;
  if (value.reviewApproved !== undefined) row.review_approved = value.reviewApproved;
  if (value.storyboardHash !== undefined) row.storyboard_hash = value.storyboardHash;
  if (value.status !== undefined) row.status = value.status;
  return row;
}

export function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    topic: row.topic,
    audience: row.audience || '',
    notes: row.notes || '',
    voicePreset: row.voice_preset || DEFAULT_VOICE_PRESET,
    format: row.format,
    formatId: row.format_id,
    targetSeconds: row.target_seconds,
    targetLabel: row.target_label,
    aspect: row.aspect,
    storyboard: row.storyboard || null,
    review: {
      approved: row.review_approved === true,
      storyboardHash: row.storyboard_hash || '',
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    persistence: 'postgres',
  };
}

function projectError(status, payload) {
  if (status === 401 || status === 403) return new ProjectRepositoryError(401, 'AUTH_REQUIRED', 'Sign in again to access projects.');
  if (status === 404) return new ProjectRepositoryError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  if (status === 400 || status === 422) return new ProjectRepositoryError(422, 'PROJECT_VALIDATION_FAILED', 'Project data was rejected.');
  if (status >= 500) return new ProjectRepositoryError(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is temporarily unavailable.');
  return new ProjectRepositoryError(502, 'PROJECT_REQUEST_FAILED', payload?.message || 'Project request failed.');
}

async function rest(path, { method = 'GET', access, body, query, env, prefer } = {}) {
  if (typeof access !== 'string' || !access) throw new ProjectRepositoryError(401, 'AUTH_REQUIRED', 'Sign in to access projects.');
  const config = requireConfig(env);
  const url = new URL(`${config.url}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${access}`,
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ProjectRepositoryError(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage did not respond.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) throw projectError(response.status, payload);
  return { payload, headers: response.headers };
}

export async function listProjects(access, { limit = 20, offset = 0, env = process.env } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number.isFinite(Number(limit)) ? Math.round(Number(limit)) : 20));
  const safeOffset = Math.max(0, Number.isFinite(Number(offset)) ? Math.round(Number(offset)) : 0);
  const { payload, headers } = await rest('projects', {
    access,
    env,
    prefer: 'count=exact',
    query: {
      select: SELECT_COLUMNS,
      order: 'updated_at.desc',
      limit: safeLimit,
      offset: safeOffset,
    },
  });
  const range = headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return {
    projects: (Array.isArray(payload) ? payload : []).map(mapProject),
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      nextOffset: Array.isArray(payload) && payload.length === safeLimit ? safeOffset + safeLimit : null,
      total: Number.isFinite(total) ? total : null,
    },
  };
}

export async function getProject(access, id, { env = process.env } = {}) {
  const { payload } = await rest('projects', {
    access,
    env,
    query: { select: SELECT_COLUMNS, id: `eq.${id}`, limit: 1 },
  });
  return Array.isArray(payload) && payload[0] ? mapProject(payload[0]) : null;
}

export async function createProject(access, input, { env = process.env } = {}) {
  const validated = validateProjectInput(input);
  if (!validated.ok) throw new ProjectRepositoryError(422, 'PROJECT_VALIDATION_FAILED', validated.error);
  const { payload } = await rest('projects', {
    method: 'POST',
    access,
    env,
    body: toRow(validated.value),
    prefer: 'return=representation',
  });
  if (!Array.isArray(payload) || !payload[0]) throw new ProjectRepositoryError(502, 'PROJECT_REQUEST_FAILED', 'Project was not returned.');
  return mapProject(payload[0]);
}

export async function updateProject(access, id, patch, { env = process.env, baseUpdatedAt } = {}) {
  const validated = validateProjectInput(patch, { partial: true });
  if (!validated.ok) throw new ProjectRepositoryError(422, 'PROJECT_VALIDATION_FAILED', validated.error);
  if (baseUpdatedAt !== undefined && !isProjectVersion(baseUpdatedAt)) {
    throw new ProjectRepositoryError(422, 'PROJECT_VERSION_INVALID', 'Send the project version you loaded.');
  }
  const query = { id: `eq.${id}`, select: SELECT_COLUMNS };
  if (baseUpdatedAt !== undefined) query.updated_at = `eq.${baseUpdatedAt}`;
  const { payload } = await rest('projects', {
    method: 'PATCH',
    access,
    env,
    body: toRow(validated.value),
    prefer: 'return=representation',
    query,
  });
  if (!Array.isArray(payload) || !payload[0]) {
    if (baseUpdatedAt !== undefined) {
      const current = await getProject(access, id, { env });
      if (!current) throw new ProjectRepositoryError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      throw new ProjectConflictError(current);
    }
    throw new ProjectRepositoryError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  }
  return mapProject(payload[0]);
}

export async function deleteProject(access, id, { env = process.env } = {}) {
  const { payload } = await rest('projects', {
    method: 'DELETE',
    access,
    env,
    prefer: 'return=representation',
    query: { id: `eq.${id}`, select: 'id' },
  });
  if (!Array.isArray(payload) || !payload[0]) {
    throw new ProjectRepositoryError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  }
  return true;
}
