import SessionKeeper from '../../../../../components/SessionKeeper';
import IdeaWorkspace from '../../../../../components/dashboard/IdeaWorkspace';
import { requireAppSession } from '../../../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Idea — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function IdeaPage({ params }) {
  const { id } = await params;
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <IdeaWorkspace user={user} projectId={id} />
    </>
  );
}
