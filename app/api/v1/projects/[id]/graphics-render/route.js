import { errorResult } from '../../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function POST() {
  return errorResult(501, 'RENDER_NOT_INCLUDED', 'Video rendering is not included in this portfolio copy.');
}

export async function GET() {
  return errorResult(503, 'RENDER_UNAVAILABLE', 'Render status is not available in this build.');
}
