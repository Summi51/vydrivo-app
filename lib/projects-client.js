import { apiRequest } from './session-fetch.js';
import { newIdempotencyKey } from './idempotency-key.js';

export const CURRENT_PROJECT_KEY = 'vydrivo.current-project-id';

export class ProjectRequestError extends Error {
  constructor(message, { status = 0, code = '', details = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isProjectConflict(error) {
  return error instanceof ProjectRequestError && error.status === 409 && error.code === 'PROJECT_CONFLICT';
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const response = await apiRequest(path, { method, body, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProjectRequestError(payload.error?.message || 'Project request failed.', {
      status: response.status,
      code: payload.error?.code || '',
      details: payload.error?.details || null,
    });
  }
  return payload.data;
}

function requireVersion(baseUpdatedAt) {
  if (typeof baseUpdatedAt !== 'string' || !baseUpdatedAt.trim()) {
    throw new ProjectRequestError('Reload the project before saving.', {
      status: 428,
      code: 'PROJECT_VERSION_REQUIRED',
    });
  }
}

export async function listProjects({ limit = 20, offset = 0 } = {}) {
  return request(`/api/v1/projects?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`);
}

export async function getProject(id) {
  const data = await request(`/api/v1/projects/${encodeURIComponent(id)}`);
  return data.project;
}

export async function createProject(input) {
  const data = await request('/api/v1/projects', {
    method: 'POST',
    body: input,
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
  return data.project;
}

export async function updateProject(id, patch, { baseUpdatedAt } = {}) {
  requireVersion(baseUpdatedAt);
  const data = await request(`/api/v1/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { ...patch, baseUpdatedAt },
  });
  return data.project;
}

export async function deleteProject(id) {
  return request(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function saveProjectStoryboard(id, { storyboard, approved = false, baseUpdatedAt }) {
  requireVersion(baseUpdatedAt);
  const data = await request(`/api/v1/projects/${encodeURIComponent(id)}/storyboard`, {
    method: 'PUT',
    body: { storyboard, approved, baseUpdatedAt },
  });
  return data.project;
}

export async function getIdeaSuggestions(id) {
  return request(`/api/v1/projects/${encodeURIComponent(id)}/ideas`);
}

export async function suggestIdeas(id, input) {
  return request(`/api/v1/projects/${encodeURIComponent(id)}/ideas`, {
    method: 'POST',
    body: input,
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
}

export function projectStoryboardSummary(project) {
  const scenes = project?.storyboard?.scenes;
  const sceneCount = Array.isArray(scenes) ? scenes.length : 0;
  const seconds = Array.isArray(scenes)
    ? scenes.reduce((total, scene) => total + (Number(scene.estimatedSeconds) || 0), 0)
    : 0;
  return {
    sceneCount,
    seconds,
    state: project?.review?.approved
      ? 'approved'
      : sceneCount
        ? 'planning'
        : 'draft',
  };
}
