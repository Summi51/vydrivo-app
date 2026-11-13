import { errorResult } from '../../../../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return errorResult(404, 'VIDEO_NOT_FOUND', 'Video not found.');
}
