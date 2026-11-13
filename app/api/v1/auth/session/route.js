import { verifiedAccess } from '../../../../../lib/api-session.js';
import { jsonResult } from '../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await verifiedAccess(request);
  return jsonResult(200, { signedIn: session.ok === true });
}
