import SessionKeeper from '../../../components/SessionKeeper';
import StudioProjects from '../../../components/dashboard/StudioProjects';
import { requireAppSession } from '../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Studio Projects — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function ProjectsPage() {
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <StudioProjects user={user} />
    </>
  );
}
