export function planningConfig(env = process.env) {
  return {
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    freeTierVerified: env.AI_FREE_TIER_VERIFIED === 'true',
  };
}

export function chatEndpoint() {
  throw new Error('Planning endpoint is not included in this copy.');
}
