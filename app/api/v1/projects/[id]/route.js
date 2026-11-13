import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import {
  deleteProject,
  getProject,
  isProjectVersion,
  ProjectConflictError,
  ProjectRepositoryError,
  updateProject,
} from '../../../../../lib/projects-repository.js';
import { deletePrivateObject } from '../../../../../lib/r2-private.js';
import { listProjectMediaKeys } from '../../../../../lib/media-assets-repository.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPDATE_FIELDS = [
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
  'baseUpdatedAt',
];

function repositoryFailure(error) {
  if (error instanceof ProjectConflictError) {
    return errorResult(409, error.code, error.message, { details: { project: error.project } });
  }
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is temporarily unavailable.');
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    return jsonResult(200, { project });
  } catch (error) {
    return repositoryFailure(error);
  }
}

export async function PATCH(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, UPDATE_FIELDS);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const { baseUpdatedAt, ...patch } = parsed.body;
  if (!isProjectVersion(baseUpdatedAt)) {
    return errorResult(428, 'PROJECT_VERSION_REQUIRED', 'Reload the project and send its current version.');
  }
  try {
    return jsonResult(200, { project: await updateProject(session.access, id, patch, { baseUpdatedAt }) });
  } catch (error) {
    return repositoryFailure(error);
  }
}

export async function DELETE(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  let mediaKeys = [];
  try {
    mediaKeys = await listProjectMediaKeys(session.access, id);
  } catch {
    // Project deletion must still work before migration 0005 is applied.
    mediaKeys = [];
  }
  try {
    await deleteProject(session.access, id);
    await Promise.allSettled(mediaKeys.map((key) => deletePrivateObject({ key })));
    return jsonResult(200, { deleted: true });
  } catch (error) {
    return repositoryFailure(error);
  }
}
