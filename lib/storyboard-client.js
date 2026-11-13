import { apiRequest } from './session-fetch.js';
import { newIdempotencyKey } from './idempotency-key.js';

export async function storyboardRequest(method, body) {
  const response = await apiRequest('/api/v1/storyboards', {
    method,
    body,
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Storyboard request failed.');
  return payload.data;
}
