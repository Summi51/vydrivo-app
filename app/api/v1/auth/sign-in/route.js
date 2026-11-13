import {
  CSRF_COOKIE,
  GENERIC_INVALID,
  cookieBase,
  guardMutation,
  issueCsrf,
  publicUser,
  sessionCookies,
  validateCredentials,
} from '../../../../../lib/auth-server.js';
import { providerFailure } from '../../../../../lib/auth.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { AuthProviderError, signInWithPassword } from '../../../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['email', 'password', 'remember']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const credentials = validateCredentials(parsed.body.email, parsed.body.password);
  if (!credentials.ok) return errorResult(422, 'VALIDATION_FAILED', credentials.error);
  const remember = parsed.body.remember === true;
  try {
    const session = await signInWithPassword(credentials.email, credentials.password);
    const user = publicUser(session.user);
    if (!user.emailVerified) {
      return errorResult(403, 'EMAIL_VERIFICATION_REQUIRED', 'Confirm your email before signing in. Open the confirmation email, then try again.');
    }
    const csrf = issueCsrf();
    return jsonResult(200, { user, csrfToken: csrf.token }, {
      cookies: [
        ...sessionCookies(request, session, false, remember),
        { name: CSRF_COOKIE, value: csrf.cookieValue, options: cookieBase(request, 60 * 30) },
      ],
    });
  } catch (error) {
    if (error instanceof AuthProviderError) {
      const mapped = providerFailure(error.code);
      if (mapped) return errorResult(mapped.status, mapped.code, mapped.error);
      if (error.status === 503) return errorResult(503, error.code, error.message);
    }
    return errorResult(401, 'INVALID_CREDENTIALS', GENERIC_INVALID);
  }
}
