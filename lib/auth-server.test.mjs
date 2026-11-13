import assert from 'node:assert/strict';
import test from 'node:test';
import { csrfMatches, issueCsrf, originAllowed, publicUrl, sessionCookies, clearSessionCookies } from './auth-server.js';

function requestWith({ origin = 'http://127.0.0.1:3001', cookie = '', url = 'http://127.0.0.1:3001/api/v1/auth/sign-in', headers = {} } = {}) {
  return new Request(url, { headers: { origin, cookie, ...headers } });
}

test('csrf token matches only the bound cookie and a fresh expiry', () => {
  const issued = issueCsrf();
  const request = requestWith({
    cookie: `vydrivo_csrf=${encodeURIComponent(issued.cookieValue)}`,
  });
  request.headers.set('x-csrf-token', issued.token);
  assert.equal(csrfMatches(request), true);
  request.headers.set('x-csrf-token', 'wrong-token-value-not-the-issued-one');
  assert.equal(csrfMatches(request), false);
});

test('origin must match the request origin', () => {
  assert.equal(originAllowed(requestWith()), true);
  assert.equal(originAllowed(requestWith({ origin: 'https://evil.example' })), false);
  assert.equal(originAllowed(requestWith({ origin: '' })), false);
  assert.equal(originAllowed(requestWith({
    origin: 'http://localhost:3000',
    url: 'http://127.0.0.1:3000/api/v1/auth/sign-in',
  })), true);
  assert.equal(originAllowed(requestWith({
    origin: 'http://localhost:3001',
    url: 'http://127.0.0.1:3000/api/v1/auth/sign-in',
  })), false);
});

test('Amplify public origin is allowed when the compute URL is internal', () => {
  const live = 'https://dev.d35b51hio740im.amplifyapp.com';
  const request = requestWith({
    origin: live,
    url: 'http://localhost:3000/api/v1/auth/google',
    headers: {
      host: 'dev.d35b51hio740im.amplifyapp.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(originAllowed(request), true);
  assert.equal(publicUrl(request, '/auth/callback').toString(), `${live}/auth/callback`);
});

test('a spoofed forwarded host cannot pass the origin check', () => {
  assert.equal(originAllowed(requestWith({
    origin: 'https://evil.example',
    url: 'http://127.0.0.1:3000/api/v1/auth/google',
    headers: {
      host: '127.0.0.1:3000',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'https',
    },
  })), false);
  assert.equal(originAllowed(requestWith({
    origin: 'https://evil.example',
    url: 'https://dev.d35b51hio740im.amplifyapp.com/api/v1/auth/google',
    headers: {
      host: 'dev.d35b51hio740im.amplifyapp.com',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'https',
    },
  })), false);
  assert.equal(originAllowed(requestWith({
    origin: 'https://dev.otherappid.amplifyapp.com',
    url: 'http://internal.compute.amazonaws.com/api/v1/auth/google',
    headers: {
      host: 'internal.compute.amazonaws.com',
      'x-forwarded-host': 'dev.otherappid.amplifyapp.com',
      'x-forwarded-proto': 'https',
    },
  })), false);
  assert.equal(originAllowed(requestWith({
    origin: 'https://dev.d35b51hio740im.amplifyapp.com.evil.example',
    url: 'http://internal.compute.amazonaws.com/api/v1/auth/google',
    headers: {
      host: 'internal.compute.amazonaws.com',
      'x-forwarded-host': 'dev.d35b51hio740im.amplifyapp.com.evil.example',
      'x-forwarded-proto': 'https',
    },
  })), false);
});

test('Amplify origin is allowed when Host is an AWS compute address', () => {
  const live = 'https://dev.d35b51hio740im.amplifyapp.com';
  const request = requestWith({
    origin: live,
    url: 'http://internal-compute.ap-southeast-2.elb.amazonaws.com/api/v1/auth/google',
    headers: {
      host: 'internal-compute.ap-southeast-2.elb.amazonaws.com',
      'x-forwarded-host': 'dev.d35b51hio740im.amplifyapp.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(originAllowed(request), true);
  assert.equal(publicUrl(request, '/auth/callback?next=recover').toString(), `${live}/auth/callback?next=recover`);
});

test('callback redirects use the public Amplify origin when Origin is absent and Host is internal', () => {
  const live = 'https://dev.d35b51hio740im.amplifyapp.com';
  // Top-level navigations (OAuth/email links) send no Origin header.
  const request = requestWith({
    origin: '',
    url: 'http://internal-compute.ap-southeast-2.elb.amazonaws.com/auth/callback',
    headers: {
      host: 'internal-compute.ap-southeast-2.elb.amazonaws.com',
      'x-forwarded-host': 'dev.d35b51hio740im.amplifyapp.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(publicUrl(request, '/app').toString(), `${live}/app`);
  assert.equal(publicUrl(request, '/sign-in?error=link').toString(), `${live}/sign-in?error=link`);
  assert.equal(publicUrl(request, '/auth/callback?next=recover').toString(), `${live}/auth/callback?next=recover`);
});

test('an internal compute origin is never allowed, even with a forwarded public host', () => {
  const live = 'https://dev.d35b51hio740im.amplifyapp.com';
  const internal = 'https://internal-compute.ap-southeast-2.elb.amazonaws.com';
  const request = requestWith({
    origin: internal,
    url: 'http://internal-compute.ap-southeast-2.elb.amazonaws.com/api/v1/auth/google',
    headers: {
      host: 'internal-compute.ap-southeast-2.elb.amazonaws.com',
      'x-forwarded-host': 'dev.d35b51hio740im.amplifyapp.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(originAllowed(request), false);
  assert.equal(publicUrl(request, '/app').toString(), `${live}/app`);
});

test('local callbacks keep the request port when Origin is absent', () => {
  const request = new Request('http://127.0.0.1:3001/auth/callback');
  assert.equal(publicUrl(request, '/sign-in?error=auth').toString(), 'http://127.0.0.1:3001/sign-in?error=auth');
});

test('session cookies are httpOnly and host-only, and sign-out clears them', () => {
  const request = requestWith();
  const cookies = sessionCookies(request, { access_token: 'a', refresh_token: 'r', expires_in: 60 });
  assert.equal(cookies.every((cookie) => cookie.options.httpOnly && cookie.options.path === '/'), true);
  assert.equal('domain' in cookies[0].options, false);
  const cleared = clearSessionCookies(request);
  assert.equal(cleared.length, 5);
  assert.equal(cleared.every((cookie) => cookie.options.maxAge === 0), true);
});

test('remember me extends the refresh cookie and marks the session', () => {
  const request = requestWith();
  const cookies = sessionCookies(request, { access_token: 'a', refresh_token: 'r', expires_in: 60 }, false, true);
  const refresh = cookies.find((cookie) => cookie.name === 'vydrivo_refresh');
  const remember = cookies.find((cookie) => cookie.name === 'vydrivo_remember');
  assert.equal(refresh.options.maxAge, 60 * 60 * 24 * 30);
  assert.equal(remember.value, '1');
  assert.equal(remember.options.maxAge, 60 * 60 * 24 * 30);
});
