import { CSRF_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE, cookieBase, guardMutation, issueCsrf, readCookie, sessionCookies } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { AuthProviderError, refreshSession } from '../../../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';
const inflight = new Map();

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, []);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const refresh = readCookie(request, REFRESH_COOKIE);
  if (!refresh) return errorResult(401, 'SESSION_EXPIRED', 'Sign in again.');
  const pending = inflight.get(refresh) || refreshSession(refresh).finally(() => inflight.delete(refresh));
  inflight.set(refresh, pending);
  try {
    const session = await pending;
    const csrf = issueCsrf();
    const remember = readCookie(request, REMEMBER_COOKIE) === '1';
    const expiresAt = new Date(Date.now() + (Number(session.expires_in) || 3600) * 1000).toISOString();
    return jsonResult(200, { expiresAt, csrfToken: csrf.token }, {
      cookies: [
        ...sessionCookies(request, session, false, remember),
        { name: CSRF_COOKIE, value: csrf.cookieValue, options: cookieBase(request, 60 * 30) },
      ],
    });
  } catch (error) {
    if (error instanceof AuthProviderError && error.status === 503) {
      return errorResult(503, error.code, error.message);
    }
    return errorResult(401, 'SESSION_EXPIRED', 'Sign in again.');
  }
}
