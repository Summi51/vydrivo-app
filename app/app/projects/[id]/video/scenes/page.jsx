import SessionKeeper from '../../../../../../components/SessionKeeper';
import SceneEditor from '../../../../../../components/dashboard/SceneEditor';
import { requireAppSession } from '../../../../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Scene text — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function SceneTextPage({ params }) {
  const { id } = await params;
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <SceneEditor user={user} projectId={id} />
    </>
  );
}
