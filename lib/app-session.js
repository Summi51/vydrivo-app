import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './auth-server.js';

function accessExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 <= Date.now() + 30_000 : false;
  } catch {
    return true;
  }
}

function userFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
    const metadata = payload.user_metadata || {};
    const email = typeof payload.email === 'string' ? payload.email : '';
    const rawName = metadata.full_name || metadata.name || email.split('@')[0] || 'Creator';
    const displayName = String(rawName).trim().slice(0, 40) || 'Creator';
    const initial = displayName.slice(0, 1).toUpperCase() || 'V';
    return { displayName, initial };
  } catch {
    return { displayName: 'Creator', initial: 'V' };
  }
}

export async function requireAppSession() {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) redirect('/sign-in');
  const needsRefresh = accessExpired(access);
  if (needsRefresh && !refresh) redirect('/sign-in?expired=1');
  return {
    user: userFromToken(access),
    needsRefresh: needsRefresh && Boolean(refresh),
  };
}
