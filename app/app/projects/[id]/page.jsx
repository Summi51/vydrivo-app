import SessionKeeper from '../../../../components/SessionKeeper';
import StoryboardWorkspace from '../../../../components/dashboard/StoryboardWorkspace';
import { requireAppSession } from '../../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Storyboard — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function StoryboardPage({ params }) {
  const { id } = await params;
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <StoryboardWorkspace user={user} projectId={id} />
    </>
  );
}
