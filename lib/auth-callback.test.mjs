import assert from 'node:assert/strict';
import test from 'node:test';
import { callbackPlan } from './auth-callback.js';

test('email confirmation works from a token hash without the Google cookie', () => {
  const plan = callbackPlan(new URL('http://127.0.0.1:3001/auth/callback?token_hash=hashed&type=signup'));
  assert.equal(plan.ok, true);
  assert.equal(plan.kind, 'otp');
  assert.equal(plan.type, 'signup');
  assert.equal(plan.next, '/app');
});

test('a code link still needs the signup cookie, and a fragment session does not', () => {
  const expired = callbackPlan(new URL('http://127.0.0.1:3001/auth/callback?code=used'));
  assert.equal(expired.ok, false);
  const fragment = callbackPlan(new URL('http://127.0.0.1:3001/auth/callback#access_token=a&refresh_token=r&type=signup'));
  assert.equal(fragment.kind, 'fragment');
  assert.equal(fragment.session.access_token, 'a');
  assert.equal(fragment.next, '/app');
});
