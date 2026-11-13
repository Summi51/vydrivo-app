const OTP_TYPES = new Set(['signup', 'email', 'recovery', 'invite', 'magiclink']);

export function fragmentSession(url) {
  const hash = new URLSearchParams(String(url.hash || '').replace(/^#/, ''));
  const access = hash.get('access_token') || '';
  const refresh = hash.get('refresh_token') || '';
  if (!access || !refresh) return null;
  return {
    access_token: access,
    refresh_token: refresh,
    expires_in: Number(hash.get('expires_in')) || 3600,
    recovery: hash.get('type') === 'recovery',
  };
}

export function callbackPlan(url, cookie = '', now = Date.now()) {
  const type = url.searchParams.get('type') || '';
  const next = url.searchParams.get('next') === 'recover' || type === 'recovery' ? '/recover' : '/app';
  const fragment = fragmentSession(url);
  if (fragment) return { ok: true, kind: 'fragment', next: fragment.recovery ? '/recover' : next, session: fragment };
  const tokenHash = url.searchParams.get('token_hash') || '';
  if (tokenHash && OTP_TYPES.has(type)) {
    return { ok: true, kind: 'otp', next, tokenHash, type: type === 'email' ? 'signup' : type };
  }
  const [verifier, expiry] = String(cookie || '').split('.');
  const code = url.searchParams.get('code') || '';
  if (!code || !verifier || Number(expiry) < now) return { ok: false, kind: 'expired' };
  return { ok: true, kind: 'pkce', next, code, verifier };
}
