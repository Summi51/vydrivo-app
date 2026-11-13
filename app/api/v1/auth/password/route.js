import { ACCESS_COOKIE, RECOVERY_COOKIE, clearSessionCookies, guardMutation, readCookie, validatePassword } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { AuthProviderError, updateUserPassword } from '../../../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  if (readCookie(request, RECOVERY_COOKIE) !== '1' || !readCookie(request, ACCESS_COOKIE)) {
    return errorResult(401, 'AUTH_REQUIRED', 'Open the recovery link again, then choose a new password.');
  }
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['newPassword']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const password = validatePassword(parsed.body.newPassword);
  if (!password.ok) return errorResult(422, 'VALIDATION_FAILED', password.error);
  try {
    await updateUserPassword(readCookie(request, ACCESS_COOKIE), password.password);
  } catch (error) {
    if (error instanceof AuthProviderError && error.status === 503) {
      return errorResult(503, error.code, error.message);
    }
    return errorResult(401, 'SESSION_EXPIRED', 'The recovery link expired. Request a new one.');
  }
  return jsonResult(204, null, { cookies: clearSessionCookies(request) });
}
