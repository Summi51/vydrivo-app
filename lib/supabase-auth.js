import { supabaseConfig } from './auth-server.js';

const TIMEOUT_MS = 12_000;

export class AuthProviderError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function unavailable() {
  return new AuthProviderError(503, 'CAPABILITY_UNAVAILABLE', 'Sign-in is not connected. Add the Supabase URL and publishable key, then restart.');
}

async function providerFetch(path, { method = 'POST', body, token, query } = {}, env = process.env) {
  const config = supabaseConfig(env);
  if (!config.configured) throw unavailable();
  const url = new URL(`${config.url}/auth/v1/${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${token || config.key}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const code = payload.error_code || payload.code || 'PROVIDER_REJECTED';
      throw new AuthProviderError(response.status, code, payload.msg || payload.error_description || 'Auth provider rejected the request.');
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthProviderError) throw error;
    throw new AuthProviderError(503, 'CAPABILITY_UNAVAILABLE', 'Auth provider did not respond.');
  } finally {
    clearTimeout(timer);
  }
}

export function signUpWithPassword(email, password, redirectTo, codeChallenge, env) {
  const body = { email, password, data: {} };
  if (codeChallenge) {
    body.code_challenge = codeChallenge;
    body.code_challenge_method = 's256';
  }
  return providerFetch('signup', { body, query: { redirect_to: redirectTo } }, env);
}

export function signInWithPassword(email, password, env) {
  return providerFetch('token', { query: { grant_type: 'password' }, body: { email, password } }, env);
}

export function recoverPassword(email, redirectTo, env) {
  return providerFetch('recover', { body: { email }, query: { redirect_to: redirectTo } }, env);
}

export function refreshSession(refreshToken, env) {
  return providerFetch('token', { query: { grant_type: 'refresh_token' }, body: { refresh_token: refreshToken } }, env);
}

export function exchangeCode(code, codeVerifier, env) {
  return providerFetch('token', { query: { grant_type: 'pkce' }, body: { auth_code: code, code_verifier: codeVerifier } }, env);
}

export function verifyEmailOtp(tokenHash, type, env) {
  return providerFetch('verify', { body: { token_hash: tokenHash, type } }, env);
}

export function updateUserPassword(accessToken, password, env) {
  return providerFetch('user', { method: 'PUT', token: accessToken, body: { password } }, env);
}

export function getUser(accessToken, env) {
  return providerFetch('user', { method: 'GET', token: accessToken }, env);
}

export function signOutProvider(accessToken, env) {
  return providerFetch('logout', { token: accessToken, body: {} }, env);
}

export function startGoogle(redirectTo, codeChallenge, env) {
  const config = supabaseConfig(env);
  if (!config.configured || !config.googleConfigured) throw unavailable();
  const url = new URL(`${config.url}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 's256');
  return url.toString();
}
