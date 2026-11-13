import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const notice =
    params?.error === 'link'
      ? 'That sign-in link expired or was already used. Request a new one and open it in this browser.'
      : params?.out
        ? 'You have been signed out. Your session cookies were cleared.'
        : params?.expired
          ? 'Your session expired. Sign in again to continue.'
          : params?.reset
            ? 'Password updated. Sign in with your new password.'
            : '';
  const noticeTone = params?.out || params?.reset ? 'ok' : 'warn';
  return <AuthScreen mode="sign-in" config={authConfig()} notice={notice} noticeTone={noticeTone} />;
}
