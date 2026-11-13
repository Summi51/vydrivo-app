import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { verifiedAccess } from '../../../../../../../../lib/api-session.js';
import { errorResult } from '../../../../../../../../lib/auth-http.js';
import { getVideoRender, isVideoStorageUnavailable } from '../../../../../../../../lib/video-renders-repository.js';
import { signVideoRenderObject } from '../../../../../../../../lib/video-storage.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOBS = path.join(process.cwd(), 'prototype/output/graphics-jobs');

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id, runId } = await params;
  if (!UUID.test(id) || !UUID.test(runId)) return errorResult(404, 'VIDEO_NOT_FOUND', 'Video not found.');

  try {
    const durable = await getVideoRender(session.access, { projectId: id, runId });
    if (durable?.thumbnailKey) {
      try {
        const signed = await signVideoRenderObject({
          ownerId: session.user.id,
          key: durable.thumbnailKey,
          contentType: 'image/jpeg',
        });
        return new Response(null, {
          status: 307,
          headers: {
            Location: signed.url,
            'Cache-Control': 'private, max-age=300',
          },
        });
      } catch (error) {
        if (!isVideoStorageUnavailable(error)) throw error;
      }
    }
  } catch (error) {
    if (!isVideoStorageUnavailable(error)) throw error;
  }

  try {
    const job = JSON.parse(readFileSync(path.join(JOBS, runId, 'job.json'), 'utf8'));
    if (job.projectId !== id || job.ownerId !== session.user.id) {
      return errorResult(404, 'VIDEO_NOT_FOUND', 'Video not found.');
    }
    const file = path.join(JOBS, runId, 'thumbnail.jpg');
    if (!existsSync(file)) return errorResult(404, 'VIDEO_THUMBNAIL_NOT_FOUND', 'Video thumbnail not found.');
    const bytes = readFileSync(file);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return errorResult(404, 'VIDEO_NOT_FOUND', 'Video not found.');
  }
}
