import {
  CSRF_COOKIE,
  GENERIC_SIGNUP,
  OAUTH_COOKIE,
  cookieBase,
  guardMutation,
  issueCsrf,
  issuePkce,
  publicUrl,
  publicUser,
  sessionCookies,
  validateCredentials,
} from '../../../../../lib/auth-server.js';
import { providerFailure } from '../../../../../lib/auth.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { AuthProviderError, signUpWithPassword } from '../../../../../lib/supabase-auth.js';

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
  if (process.env.AUTH_SIGNUP_ENABLED === 'false') {
    return errorResult(403, 'FEATURE_UNAVAILABLE', 'Sign-up is not open yet.');
  }
  const pkce = issuePkce();
  try {
    const redirectTo = publicUrl(request, '/auth/callback').toString();
    const result = await signUpWithPassword(credentials.email, credentials.password, redirectTo, pkce.challenge);
    if (result?.access_token) {
      const csrf = issueCsrf();
      return jsonResult(200, { user: publicUser(result.user), csrfToken: csrf.token }, {
        cookies: [
          ...sessionCookies(request, result, false, remember),
          { name: CSRF_COOKIE, value: csrf.cookieValue, options: cookieBase(request, 60 * 30) },
          { name: OAUTH_COOKIE, value: '', options: cookieBase(request, 0) },
        ],
      });
    }
    return jsonResult(202, { message: GENERIC_SIGNUP }, {
      cookies: [{ name: OAUTH_COOKIE, value: pkce.cookieValue, options: cookieBase(request, 60 * 60) }],
    });
  } catch (error) {
    if (error instanceof AuthProviderError) {
      const mapped = providerFailure(error.code);
      if (mapped) return errorResult(mapped.status, mapped.code, mapped.error);
      if (error.status === 503) return errorResult(503, error.code, error.message);
    }
  }
  return jsonResult(202, { message: GENERIC_SIGNUP });
}
