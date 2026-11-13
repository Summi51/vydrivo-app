import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create account — Vydrivo',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <AuthScreen mode="sign-up" config={authConfig()} />;
}
