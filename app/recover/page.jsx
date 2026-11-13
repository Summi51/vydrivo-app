import { cookies } from 'next/headers';
import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';
import { RECOVERY_COOKIE } from '../../lib/auth-server.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reset password — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function RecoverPage() {
  const store = await cookies();
  const recovering = store.get(RECOVERY_COOKIE)?.value === '1';
  return <AuthScreen mode={recovering ? 'password' : 'recover'} config={authConfig()} />;
}
