import SessionKeeper from '../../../components/SessionKeeper';
import StudioVideos from '../../../components/dashboard/StudioVideos';
import { requireAppSession } from '../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Videos — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function VideosPage() {
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <StudioVideos user={user} />
    </>
  );
}
