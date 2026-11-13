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
  if (!UUID.test(id) || !UUID.test(runId)) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  const download = new URL(request.url).searchParams.get('download') === '1';

  try {
    const durable = await getVideoRender(session.access, { projectId: id, runId });
    if (durable?.videoKey) {
      try {
        const signed = await signVideoRenderObject({
          ownerId: session.user.id,
          key: durable.videoKey,
          downloadName: download ? `vydrivo-${runId}.mp4` : undefined,
          contentType: 'video/mp4',
        });
        return new Response(null, {
          status: 307,
          headers: {
            Location: signed.url,
            'Cache-Control': 'private, no-store',
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
      return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    }
    const status = JSON.parse(readFileSync(path.join(JOBS, runId, 'status.json'), 'utf8'));
    if (status.state !== 'done') return errorResult(404, 'GRAPHICS_RUN_NOT_READY', 'Graphics render is not ready.');
    const file = path.join(JOBS, runId, 'output.mp4');
    if (!existsSync(file)) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    const bytes = readFileSync(file);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(bytes.length),
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="vydrivo-${runId}.mp4"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  }
}
