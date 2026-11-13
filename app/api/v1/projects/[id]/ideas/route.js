import { errorResult } from '../../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

// Public contract only. Suggestion generation is served by the private API.
export async function GET() {
  return errorResult(503, 'IDEAS_UNAVAILABLE', 'Idea directions are not available in this build.');
}

export async function POST() {
  return errorResult(501, 'IDEAS_NOT_IMPLEMENTED', 'Idea generation is not included in this portfolio copy.');
}
