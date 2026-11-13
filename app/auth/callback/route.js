import { callbackPlan } from '../../../lib/auth-callback.js';
import { OAUTH_COOKIE, clearSessionCookies, cookieBase, publicUrl, readCookie, sessionCookies } from '../../../lib/auth-server.js';
import { redirectResult } from '../../../lib/auth-http.js';
import { exchangeCode, verifyEmailOtp } from '../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

function signedIn(request, location, session, recovery) {
  return redirectResult(location, [
    ...sessionCookies(request, session, recovery),
    { name: OAUTH_COOKIE, value: '', options: cookieBase(request, 0) },
  ]);
}

export async function GET(request) {
  const url = new URL(request.url);
  const fail = publicUrl(request, '/sign-in?error=link');
  const plan = callbackPlan(url, readCookie(request, OAUTH_COOKIE));
  if (!plan.ok) return redirectResult(fail, clearSessionCookies(request));
  if (plan.kind === 'fragment') {
    return signedIn(request, publicUrl(request, plan.next), plan.session, plan.session.recovery);
  }
  try {
    const session = plan.kind === 'otp'
      ? await verifyEmailOtp(plan.tokenHash, plan.type)
      : await exchangeCode(plan.code, plan.verifier);
    return signedIn(request, publicUrl(request, plan.next), session, plan.next === '/recover');
  } catch {
    return redirectResult(fail, clearSessionCookies(request));
  }
}
