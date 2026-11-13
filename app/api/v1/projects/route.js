import { verifiedAccess } from '../../../../lib/api-session.js';
import { guardMutation } from '../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../lib/auth-http.js';
import {
  createProject,
  listProjects,
  ProjectRepositoryError,
} from '../../../../lib/projects-repository.js';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  consumeRateLimit,
  failIdempotentRequest,
} from '../../../../lib/request-safety.js';

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

function rateLimitFailure(rate) {
  const reset = new Date(rate.resetAt).getTime();
  const retryAfter = Number.isFinite(reset) ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
  return errorResult(429, 'RATE_LIMITED', `Too many requests. Try again in ${retryAfter} seconds.`, { retryAfter });
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

  const rate = await consumeRateLimit(session.access, { bucket: 'projects', limit: 60, windowSeconds: 3600 });
  if (rate.available && !rate.allowed) return rateLimitFailure(rate);
  const idempotent = await beginIdempotentRequest(session.access, {
    ownerId: session.user.id,
    scope: 'projects:create',
    clientKey: request.headers.get('idempotency-key'),
    body: parsed.body,
  });
  if (idempotent.state === 'replay') {
    return jsonResult(idempotent.response.status || 200, idempotent.response.body);
  }
  if (idempotent.state === 'in_progress') {
    return errorResult(409, 'REQUEST_IN_PROGRESS', 'This request is already running.');
  }
  if (idempotent.state === 'mismatch') {
    return errorResult(422, 'IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for a different request.');
  }
  if (idempotent.state === 'failed') {
    return errorResult(409, 'PREVIOUS_ATTEMPT_FAILED', 'The previous attempt failed. Try again.');
  }

  try {
    const body = { project: await createProject(session.access, parsed.body) };
    if (idempotent.key) await completeIdempotentRequest(session.access, idempotent.key, { status: 201, body });
    return jsonResult(201, body);
  } catch (error) {
    if (idempotent.key) {
      await failIdempotentRequest(session.access, idempotent.key, {
        status: error.status || 500,
        body: { message: error.message || 'Project creation failed.' },
      });
    }
    return repositoryFailure(error);
  }
}
