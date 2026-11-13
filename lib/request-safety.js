// Portfolio stub. Durable replay and rate limits are not included.

export async function consumeRateLimit() {
  return { available: false, allowed: true };
}

export async function beginIdempotentRequest() {
  return { state: 'skipped' };
}

export async function completeIdempotentRequest() {
  return { state: 'skipped' };
}

export async function failIdempotentRequest() {
  return { state: 'skipped' };
}
