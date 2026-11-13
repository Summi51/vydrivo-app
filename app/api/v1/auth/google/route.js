import { OAUTH_COOKIE, cookieBase, guardMutation, issuePkce, publicUrl } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { AuthProviderError, startGoogle } from '../../../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, []);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const pkce = issuePkce();
  try {
    const redirectTo = publicUrl(request, '/auth/callback').toString();
    const authorizationUrl = startGoogle(redirectTo, pkce.challenge);
    return jsonResult(200, { authorizationUrl }, {
      cookies: [{ name: OAUTH_COOKIE, value: pkce.cookieValue, options: cookieBase(request, 60 * 10) }],
    });
  } catch (error) {
    if (error instanceof AuthProviderError) return errorResult(error.status, error.code, error.message);
    return errorResult(503, 'CAPABILITY_UNAVAILABLE', 'Google sign-in is not connected.');
  }
}
