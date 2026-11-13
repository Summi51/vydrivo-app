import { ACCESS_COOKIE, readCookie } from './auth-server.js';
import { AuthProviderError, getUser } from './supabase-auth.js';

export async function verifiedAccess(request, env = process.env) {
  const access = readCookie(request, ACCESS_COOKIE);
  if (!access) {
    return { ok: false, status: 401, code: 'AUTH_REQUIRED', message: 'Sign in before continuing.' };
  }
  try {
    const user = await getUser(access, env);
    return { ok: true, user, access };
  } catch (error) {
    if (error instanceof AuthProviderError && error.status === 401) {
      return { ok: false, status: 401, code: 'AUTH_REQUIRED', message: 'Your session is no longer valid. Sign in again.' };
    }
    return { ok: false, status: 503, code: 'AUTH_UNAVAILABLE', message: 'Session verification is temporarily unavailable.' };
  }
}
