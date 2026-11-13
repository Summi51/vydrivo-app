import { errorResult } from '../../../../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
}
