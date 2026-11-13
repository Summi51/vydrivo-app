import assert from 'node:assert/strict';
import test from 'node:test';
import { authConfig, authUnavailable, providerFailure, supabaseEnv, validateCredentials, validateEmail } from './auth.js';

test('credentials accept a normal email and a 12 character password', () => {
  const result = validateCredentials('  Creator@Agency.Design ', 'correct-horse');
  assert.equal(result.ok, true);
  assert.equal(result.email, 'creator@agency.design');
});

test('credentials reject short, spaced, and missing passwords without trimming them', () => {
  assert.equal(validateCredentials('a@b.co', 'short-pass').ok, false);
  assert.equal(validateCredentials('a@b.co', ' correct-horse').ok, false);
  assert.equal(validateCredentials('not-an-email', 'correct-horse').ok, false);
  assert.equal(validateEmail('').ok, false);
});

test('auth stays unavailable until both Supabase values exist', () => {
  assert.equal(authConfig({}).configured, false);
  assert.equal(authConfig({ SUPABASE_URL: 'https://example.supabase.co' }).configured, false);
  const ready = authConfig({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'publishable',
    SUPABASE_GOOGLE_ENABLED: 'true',
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.googleConfigured, true);
  assert.equal(authUnavailable('Sign-in', authConfig({})).code, 'AUTH_NOT_CONFIGURED');
});

test('public Supabase values are used when server-only values are absent', () => {
  const publicOnly = authConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
    NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED: 'true',
  });
  assert.equal(publicOnly.configured, true);
  assert.equal(publicOnly.googleConfigured, true);
  assert.equal(supabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/' }).url, 'https://example.supabase.co');
  assert.equal(authConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }).configured, false);
});

test('server-only Supabase values take priority over public fallbacks', () => {
  const env = {
    SUPABASE_URL: 'https://server.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'server-key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://public.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
  };
  const resolved = supabaseEnv(env);
  assert.equal(resolved.url, 'https://server.supabase.co');
  assert.equal(resolved.key, 'server-key');
  assert.equal(supabaseEnv({ ...env, SUPABASE_URL: '   ' }).url, 'https://public.supabase.co');
});

test('provider failures map to clear client errors without revealing accounts', () => {
  assert.equal(providerFailure('email_not_confirmed').status, 403);
  assert.equal(providerFailure('email_not_confirmed').code, 'EMAIL_VERIFICATION_REQUIRED');
  assert.equal(providerFailure('over_email_send_rate_limit').status, 429);
  assert.equal(providerFailure('over_email_send_rate_limit').code, 'RATE_LIMITED');
  assert.equal(providerFailure('invalid_credentials'), null);
});
