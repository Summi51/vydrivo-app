const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const UUID = new RegExp(`^${UUID_SOURCE}$`, 'i');

export const MEDIA_KINDS = new Set(['reference', 'thumbnail']);

export const MEDIA_MIME_RULES = {
  'video/mp4': { ext: 'mp4', max: 100 * 1024 * 1024, kinds: ['reference'] },
  'video/webm': { ext: 'webm', max: 100 * 1024 * 1024, kinds: ['reference'] },
  'image/jpeg': { ext: 'jpg', max: 20 * 1024 * 1024, kinds: ['reference', 'thumbnail'] },
  'image/png': { ext: 'png', max: 20 * 1024 * 1024, kinds: ['reference', 'thumbnail'] },
};

export const MEDIA_ACCEPT = Object.keys(MEDIA_MIME_RULES).join(',');

export function isMediaUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}

export function mediaMimeRule(mime) {
  return typeof mime === 'string' ? MEDIA_MIME_RULES[mime] || null : null;
}

export function cleanMediaFilename(value) {
  const name = String(value || '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\x00-\x1f<>"]/g, '')
    .trim();
  return name.slice(0, 120) || 'reference';
}

export function formatMediaBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 MB';
  if (value >= 1024 * 1024) {
    const mb = value / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function validateMediaIntent({ projectId, kind, mime, bytes } = {}) {
  if (!isMediaUuid(projectId)) {
    return { ok: false, code: 'INVALID_PROJECT', message: 'Choose a valid project.' };
  }
  if (typeof kind !== 'string' || !MEDIA_KINDS.has(kind)) {
    return { ok: false, code: 'INVALID_MEDIA_KIND', message: 'Choose a supported media kind.' };
  }
  const rule = mediaMimeRule(mime);
  if (!rule) {
    return { ok: false, code: 'INVALID_MEDIA_TYPE', message: 'Choose a supported image or video type.' };
  }
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > rule.max) {
    return { ok: false, code: 'INVALID_MEDIA_SIZE', message: 'The file size is outside the allowed limit.' };
  }
  if (!rule.kinds.includes(kind)) {
    return { ok: false, code: 'INVALID_MEDIA_KIND', message: 'This media kind does not support that file type.' };
  }
  return {
    ok: true,
    value: { projectId, kind, mime, bytes, maxBytes: rule.max, ext: rule.ext },
  };
}
