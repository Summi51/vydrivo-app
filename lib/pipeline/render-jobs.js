// Incomplete on purpose. Job orchestration, narration and export checks
// are private and are not published with this portfolio copy.

export function createRenderJob() {
  return { status: 'unavailable', output: null };
}

export async function pollRenderJob(runId) {
  if (!runId) return { status: 'missing' };
  return { status: 'unavailable', runId };
}
