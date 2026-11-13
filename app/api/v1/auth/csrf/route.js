import { CSRF_COOKIE, cookieBase, issueCsrf } from '../../../../../lib/auth-server.js';
import { jsonResult } from '../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const csrf = issueCsrf();
  return jsonResult(200, { csrfToken: csrf.token, expiresAt: csrf.expiresAt }, {
    cookies: [{ name: CSRF_COOKIE, value: csrf.cookieValue, options: cookieBase(request, 60 * 30) }],
  });
}
