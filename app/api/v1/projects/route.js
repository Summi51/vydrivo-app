import { verifiedAccess } from '../../../../lib/api-session.js';
import { guardMutation } from '../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../lib/auth-http.js';
import {
  createProject,
  listProjects,
  ProjectRepositoryError,
} from '../../../../lib/projects-repository.js';

export const dynamic = 'force-dynamic';

const CREATE_FIELDS = [
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
];

function repositoryFailure(error) {
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is temporarily unavailable.');
}

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || 20);
  const offset = Number(url.searchParams.get('offset') || 0);
  try {
    return jsonResult(200, await listProjects(session.access, { limit, offset }));
  } catch (error) {
    return repositoryFailure(error);
  }
}

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, CREATE_FIELDS);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  try {
    return jsonResult(201, { project: await createProject(session.access, parsed.body) });
  } catch (error) {
    return repositoryFailure(error);
  }
}
