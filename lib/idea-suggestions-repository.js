import { supabaseConfig } from './auth-server.js';
import { cleanIdeaSuggestions } from './idea-suggestions-shape.js';

const TABLE = 'project_idea_suggestions';

export class IdeaSuggestionsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireConfig(env) {
  const config = supabaseConfig(env);
  if (!config.configured) {
    throw new IdeaSuggestionsError(503, 'IDEA_SUGGESTIONS_UNAVAILABLE', 'Saved directions are not configured on this server.');
  }
  return config;
}

async function rest(path, { method = 'GET', access, body, query, env, prefer } = {}) {
  if (typeof access !== 'string' || !access) {
    throw new IdeaSuggestionsError(401, 'AUTH_REQUIRED', 'Sign in to access saved directions.');
  }
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
    throw new IdeaSuggestionsError(503, 'IDEA_SUGGESTIONS_UNAVAILABLE', 'Saved directions did not respond.');
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) {
    throw new IdeaSuggestionsError(
      response.status,
      payload?.code || 'IDEA_SUGGESTIONS_REQUEST_FAILED',
      payload?.message || 'Saved directions request failed.',
    );
  }
  return payload;
}

export async function getIdeaSuggestions(access, projectId, { env = process.env } = {}) {
  try {
    const payload = await rest(TABLE, {
      access,
      env,
      query: { select: 'suggestions,source_topic,updated_at', project_id: `eq.${projectId}`, limit: 1 },
    });
    const row = Array.isArray(payload) ? payload[0] : null;
    return {
      available: true,
      suggestions: cleanIdeaSuggestions(row?.suggestions),
      sourceTopic: typeof row?.source_topic === 'string' ? row.source_topic : '',
      savedAt: row?.updated_at || null,
    };
  } catch (error) {
    // A missing migration/table is a 404 from PostgREST. The caller falls back
    // to the browser cache; generation must keep working before the migration.
    if (error instanceof IdeaSuggestionsError && error.status === 404) {
      return { available: false, suggestions: [], sourceTopic: '', savedAt: null };
    }
    throw error;
  }
}

export async function saveIdeaSuggestions(access, projectId, { suggestions, sourceTopic = '' }, { env = process.env } = {}) {
  const clean = cleanIdeaSuggestions(suggestions);
  if (!clean.length) return false;
  try {
    await rest(TABLE, {
      method: 'POST',
      access,
      env,
      query: { on_conflict: 'project_id' },
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        project_id: projectId,
        suggestions: clean,
        source_topic: String(sourceTopic || '').slice(0, 2000),
      },
    });
    return true;
  } catch (error) {
    // Missing table or RLS policy: keep the generated suggestions usable and
    // let the browser cache cover this session.
    if (error instanceof IdeaSuggestionsError && (error.status === 404 || error.status === 403)) return false;
    throw error;
  }
}
