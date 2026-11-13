import { jsonResult } from '../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

// The library UI expects this shape. Durable storage and signed playback
// are intentionally omitted from the public repository.
export async function GET() {
  return jsonResult({ videos: [], durableCount: 0, localCount: 0, storageAvailable: false });
}
