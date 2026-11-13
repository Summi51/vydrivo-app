import SessionKeeper from '../../components/SessionKeeper';
import CreatorStudio from '../../components/dashboard/CreatorStudio';
import { requireAppSession } from '../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator Studio — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function AppHome() {
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <CreatorStudio user={user} />
    </>
  );
}
