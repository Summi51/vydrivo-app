import { cleanMediaFilename, mediaMimeRule, validateMediaIntent } from './media-rules.js';

export const REFERENCE_FILE_HINT = 'PNG, JPEG, MP4 or WebM. Images up to 20 MB; videos up to 100 MB and 60 seconds.';

export function validateReferenceFile(file, projectId) {
  const mime = String(file?.type || '').toLowerCase();
  const bytes = Number(file?.size);
  const rule = mediaMimeRule(mime);
  if (!rule || !rule.kinds.includes('reference')) {
    return { ok: false, error: 'Choose a PNG, JPEG, MP4 or WebM file.' };
  }
  const result = validateMediaIntent({ projectId, kind: 'reference', mime, bytes });
  if (!result.ok) {
    if (result.code === 'INVALID_MEDIA_SIZE') {
      return { ok: false, error: 'That file is too large. Images can be up to 20 MB and videos up to 100 MB.' };
    }
    return { ok: false, error: result.message };
  }
  return {
    ok: true,
    mime,
    bytes,
    filename: cleanMediaFilename(file?.name),
  };
}
