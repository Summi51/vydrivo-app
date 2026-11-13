export function planningConfig(env = process.env) {
  return {
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    freeTierVerified: env.AI_FREE_TIER_VERIFIED === 'true',
  };
}

export function chatEndpoint(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl || '');
  } catch {
    throw new Error('Configure AI_BASE_URL as an https URL.');
  }
  if (url.protocol !== 'https:') throw new Error('AI_BASE_URL must use https.');
  if (url.username || url.password) throw new Error('AI_BASE_URL must not contain credentials.');
  return `${url.toString().replace(/\/$/, '')}/chat/completions`;
}
