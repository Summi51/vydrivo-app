import { ACCESS_COOKIE, clearSessionCookies, guardMutation, readCookie } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { signOutProvider } from '../../../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, []);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const access = readCookie(request, ACCESS_COOKIE);
  if (access) {
    try {
      await signOutProvider(access);
    } catch {
      // Cookie clear still happens. An already-issued access token can remain valid until expiry.
    }
  }
  return jsonResult(204, null, { cookies: clearSessionCookies(request) });
}
