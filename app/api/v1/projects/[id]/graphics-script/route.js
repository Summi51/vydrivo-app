import { errorResult } from '../../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return errorResult(503, 'SCRIPT_UNAVAILABLE', 'Scene text is not available in this build.');
}

export async function POST() {
  return errorResult(501, 'SCRIPT_NOT_INCLUDED', 'Scene text preparation is not included in this portfolio copy.');
}

export async function PUT() {
  return errorResult(501, 'SCRIPT_NOT_INCLUDED', 'Scene text saving is not included in this portfolio copy.');
}
