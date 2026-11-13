import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { supabaseEnv, validateCredentials, validateEmail, validatePassword } from './auth.js';

export const CSRF_COOKIE = 'vydrivo_csrf';
export const ACCESS_COOKIE = 'vydrivo_access';
export const REFRESH_COOKIE = 'vydrivo_refresh';
export const RECOVERY_COOKIE = 'vydrivo_recovery';
export const OAUTH_COOKIE = 'vydrivo_oauth';
export const REMEMBER_COOKIE = 'vydrivo_remember';
const CSRF_TTL_SECONDS = 60 * 30;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 14;
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
const GENERIC_SIGNUP = 'Check your email to continue.';
const GENERIC_RECOVERY = 'If an account exists, check your email to continue.';
const GENERIC_INVALID = 'Email or password is incorrect.';

export function cookieBase(request, maxAge) {
  return { httpOnly: true, sameSite: 'lax', secure: requestIsSecure(request), path: '/', maxAge };
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('base64url');
}

export function issueCsrf() {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + CSRF_TTL_SECONDS * 1000).toISOString();
  return { token, cookieValue: `${hashToken(token)}.${Date.now() + CSRF_TTL_SECONDS * 1000}`, expiresAt };
}
export function issuePkce() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  return { verifier, challenge, cookieValue: `${verifier}.${expiresAt}` };
}


export function csrfMatches(request) {
  const presented = request.headers.get('x-csrf-token') || '';
  const stored = readCookie(request, CSRF_COOKIE);
  const [digest, expiry] = stored.split('.');
  if (!presented || !digest || Number(expiry) < Date.now()) return false;
  const actual = Buffer.from(hashToken(presented));
  const expected = Buffer.from(digest);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
// x-forwarded-host is client-settable. Trust it only for this app's Amplify
// hosts, and only when Host itself is an internal compute address.
const AMPLIFY_APP_ID = 'd35b51hio740im';
const AMPLIFY_HOST_SUFFIX = `.${AMPLIFY_APP_ID}.amplifyapp.com`;

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function parsedHost(host) {
  const value = String(host || '').trim().toLowerCase();
  if (!value || value.length > 255 || /[\s/?#@\\]/.test(value)) return null;
  try {
    const parsed = new URL(`https://${value}`);
    const acceptable = new Set([parsed.host, parsed.hostname, `${parsed.hostname}:443`]);
    return acceptable.has(value) ? parsed : null;
  } catch {
    return null;
  }
}

function hostIsCompute(hostname) {
  const name = String(hostname || '').toLowerCase();
  if (!name || LOCAL_HOSTS.has(name) || name.endsWith('.internal') || name.endsWith('.local')) return true;
  if (name.endsWith('.amazonaws.com') || name.endsWith('.cloudfront.net') || name.endsWith('.on.aws')) return true;
  return /^[0-9.]+$/.test(name) || name.includes(':');
}

function hostIsInternal(host) {
  const parsed = parsedHost(host);
  if (!parsed) return true;
  return hostIsCompute(parsed.hostname);
}

function requestIsSecure(request) {
  if (firstHeaderValue(request.headers.get('x-forwarded-proto')) === 'https') return true;
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function originFor(proto, host) {
  const parsed = parsedHost(host);
  if (!parsed || LOCAL_HOSTS.has(parsed.hostname)) return '';
  try {
    return new URL(`${proto}//${host}`).origin;
  } catch {
    return '';
  }
}

function isAppAmplifyHost(hostname) {
  const name = String(hostname || '').toLowerCase();
  if (name === `${AMPLIFY_APP_ID}.amplifyapp.com`) return true;
  return name.endsWith(AMPLIFY_HOST_SUFFIX) && name.length > AMPLIFY_HOST_SUFFIX.length;
}

function forwardedAmplifyOrigin(request) {
  const host = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const parsed = parsedHost(host);
  if (!parsed || !isAppAmplifyHost(parsed.hostname)) return '';
  if (firstHeaderValue(request.headers.get('x-forwarded-proto')) !== 'https') return '';
  return originFor('https:', host);
}

// Amplify/CloudFront terminates TLS and rewrites request.url to an internal host.
// The browser Origin is the public host. A page cannot set Host, so that header is
// the CSRF signal. x-forwarded-host is client-settable, so it is used only when Host
// itself is an internal compute address — never as a way to match an attacker Origin.
export function publicOrigins(request) {
  const origins = [];
  const seen = new Set();
  const add = (value) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    origins.push(value);
  };
  try {
    const requestOrigin = new URL(request.url);
    if (!hostIsCompute(requestOrigin.hostname)) add(requestOrigin.origin);
  } catch {
    // request.url can be an internal compute address; Host still counts.
  }
  const proto = requestIsSecure(request) ? 'https:' : 'http:';
  const host = firstHeaderValue(request.headers.get('host'));
  // An internal/compute Host (load balancer, Lambda address) is never the public
  // origin the browser used, so it must not become an allowed origin. The public
  // origin comes from x-forwarded-host, trusted only for this app's Amplify hosts.
  if (!hostIsCompute(host)) add(originFor(proto, host));
  if (hostIsInternal(host)) add(forwardedAmplifyOrigin(request));
  return origins;
}

export function publicUrl(request, path) {
  const origin = request.headers.get('origin');
  if (origin && originAllowed(request)) return new URL(path, origin);
  const candidates = publicOrigins(request);
  // Prefer a public, browser-reachable origin. Internal compute origins are
  // only used when nothing public is available (pure server-to-server callers).
  const base = candidates.find((value) => {
    try {
      return !hostIsCompute(new URL(value).hostname);
    } catch {
      return false;
    }
  }) || candidates[0] || new URL(request.url).origin;
  return new URL(path, base);
}

export function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const presented = new URL(origin);
    if (presented.origin !== origin) return false;
    if (publicOrigins(request).includes(presented.origin)) return true;
    // CloudFront may terminate TLS before the Host header is visible. A browser
    // cannot set Host to a different site than Origin, so a matching host plus
    // https is the same site, not a spoofed one.
    const host = parsedHost(firstHeaderValue(request.headers.get('host')));
    if (
      host
      && isAppAmplifyHost(host.hostname)
      && presented.host === host.host
      && presented.protocol === 'https:'
    ) return true;
    const requestOrigin = new URL(request.url);
    return presented.protocol === requestOrigin.protocol
      && presented.port === requestOrigin.port
      && LOCAL_HOSTS.has(presented.hostname)
      && LOCAL_HOSTS.has(requestOrigin.hostname);
  } catch {
    return false;
  }
}

export function guardMutation(request) {
  if (!originAllowed(request)) return { ok: false, status: 403, code: 'CSRF_FAILED', message: 'Request origin was rejected.' };
  if (!csrfMatches(request)) return { ok: false, status: 403, code: 'CSRF_FAILED', message: 'Refresh the page and try again.' };
  return { ok: true };
}

export function supabaseConfig(env) {
  const { url, key, google } = supabaseEnv(env);
  return {
    provider: 'supabase',
    configured: Boolean(url && key),
    googleConfigured: google,
    url,
    key,
  };
}

export function sessionCookies(request, session, recovery = false, remember = false) {
  const access = session.access_token;
  const refresh = session.refresh_token;
  const expiresIn = Number(session.expires_in) || 3600;
  const refreshTtl = remember ? REMEMBER_TTL_SECONDS : REFRESH_TTL_SECONDS;
  const cookies = [
    { name: ACCESS_COOKIE, value: access, options: cookieBase(request, expiresIn) },
    { name: REFRESH_COOKIE, value: refresh, options: cookieBase(request, refreshTtl) },
    {
      name: REMEMBER_COOKIE,
      value: remember ? '1' : '',
      options: cookieBase(request, remember ? REMEMBER_TTL_SECONDS : 0),
    },
  ];
  if (recovery) {
    cookies.push({ name: RECOVERY_COOKIE, value: '1', options: cookieBase(request, expiresIn) });
  }
  return cookies;
}

export function clearSessionCookies(request) {
  const gone = cookieBase(request, 0);
  return [ACCESS_COOKIE, REFRESH_COOKIE, RECOVERY_COOKIE, OAUTH_COOKIE, REMEMBER_COOKIE].map((name) => ({
    name,
    value: '',
    options: gone,
  }));
}

export function publicUser(user) {
  return {
    id: user?.id || null,
    emailVerified: Boolean(user?.email_confirmed_at || user?.confirmed_at),
  };
}

export { validateCredentials, validateEmail, validatePassword, GENERIC_SIGNUP, GENERIC_RECOVERY, GENERIC_INVALID };
