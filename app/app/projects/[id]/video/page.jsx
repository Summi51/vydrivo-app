import SessionKeeper from '../../../../../components/SessionKeeper';
import VideoWorkspace from '../../../../../components/dashboard/VideoWorkspace';
import { requireAppSession } from '../../../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Video — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function VideoPage({ params }) {
  const { id } = await params;
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <VideoWorkspace user={user} projectId={id} />
    </>
  );
}
