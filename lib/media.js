// Public media base URL. Only NEXT_PUBLIC_* values are inlined into the client
// bundle, so the base URL must be a public CDN origin, never a private bucket
// endpoint and never a credential.
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '').trim().replace(/\/+$/, '');

export const MEDIA_BASE_VARIABLE = 'NEXT_PUBLIC_MEDIA_BASE_URL';

export function mediaUrl(path, base = MEDIA_BASE) {
  const clean = String(path || '').trim().replace(/^\/+/, '').replace(/^videos\//, '');
  if (!clean) return '';
  const origin = String(base || '').trim().replace(/\/+$/, '');
  return origin ? `${origin}/${clean}` : `/videos/${clean}`;
}
