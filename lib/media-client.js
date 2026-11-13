import { apiRequest } from './session-fetch.js';
import { validateReferenceFile } from './media-upload.js';

export class MediaRequestError extends Error {
  constructor(message, { status = 0, code = '', details = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await apiRequest(path, { method, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MediaRequestError(payload.error?.message || 'Media request failed.', {
      status: response.status,
      code: payload.error?.code || '',
      details: payload.error?.details || null,
    });
  }
  return payload.data;
}

export async function createMediaUploadIntent({ projectId, kind = 'reference', mime, bytes, filename }) {
  return request('/api/v1/media/upload-intents', {
    method: 'POST',
    body: { projectId, kind, mime, bytes, filename },
  });
}

export async function finalizeMediaAsset(assetId) {
  return request(`/api/v1/media/assets/${encodeURIComponent(assetId)}/finalize`, {
    method: 'POST',
    body: {},
  });
}

export async function listMediaAssets(projectId) {
  return request(`/api/v1/media/assets?projectId=${encodeURIComponent(projectId)}`);
}

export async function deleteMediaAsset(assetId) {
  return request(`/api/v1/media/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
}

export async function getMediaAccessUrl(key) {
  return request('/api/v1/media/access', {
    method: 'POST',
    body: { key },
  });
}

export async function uploadReferenceFile(file, { projectId, onStage } = {}) {
  const checked = validateReferenceFile(file, projectId);
  if (!checked.ok) {
    throw new MediaRequestError(checked.error, { status: 422, code: 'INVALID_MEDIA_FILE' });
  }

  onStage?.('preparing');
  const intent = await createMediaUploadIntent({
    projectId,
    kind: 'reference',
    mime: checked.mime,
    bytes: checked.bytes,
    filename: checked.filename,
  });

  onStage?.('uploading');
  let response;
  try {
    response = await fetch(intent.uploadUrl, {
      method: intent.method,
      headers: intent.headers,
      body: file,
    });
  } catch {
    throw new MediaRequestError('Upload failed. Check your connection and try again.', {
      status: 0,
      code: 'UPLOAD_FAILED',
    });
  }
  if (!response.ok) {
    throw new MediaRequestError('Upload failed. The link may have expired; try again.', {
      status: response.status,
      code: 'UPLOAD_FAILED',
    });
  }

  onStage?.('checking');
  return finalizeMediaAsset(intent.assetId);
}
