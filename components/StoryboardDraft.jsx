'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readStoryboard, saveStoryboard } from '../lib/storyboard-storage.js';
import { storyboardRequest } from '../lib/storyboard-client.js';

function SceneRow({ scene, index }) {
  return (
    <article className="rounded-xl border border-[#EFEFF1] bg-[#FAFAFB] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">
          {String(index + 1).padStart(2, '0')} · {scene.visualKind?.replaceAll('-', ' ') || 'scene'}
        </p>
        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] text-[#77747D] ring-1 ring-[#EFEFF1]">
          {scene.estimatedSeconds}s
        </span>
      </div>
      <h3 className="mt-1.5 font-headline text-sm font-bold tracking-[-0.02em] text-[#2A1728]">{scene.title}</h3>
      <p className="mt-1.5 text-[11px] leading-5 text-[#5E5A64]">{scene.narration}</p>
      {scene.visualPrompt ? <p className="mt-1.5 text-[10px] leading-4 text-[#A8A5AD]">Visual: {scene.visualPrompt}</p> : null}
    </article>
  );
}

export default function StoryboardDraft({ topic, projectId, signedIn }) {
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setBoard(readStoryboard(window.sessionStorage, projectId));
    } catch {
      setBoard(null);
    }
  }, [projectId]);

  async function draft() {
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const data = await storyboardRequest('POST', { topic });
      saveStoryboard(window.sessionStorage, data, projectId);
      setBoard(data);
      setStatus('Storyboard draft ready. Review every scene before approval.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!board) return;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const data = await storyboardRequest('PUT', { storyboard: board.storyboard, approved: true });
      const saved = { ...board, review: data.review };
      saveStoryboard(window.sessionStorage, saved, projectId);
      setBoard(saved);
      setStatus('This exact draft is approved. Video generation is still not connected.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const approved = board?.review?.approved === true;
  const sceneCount = board?.sceneCount || board?.storyboard?.scenes?.length || 0;
  const seconds = board?.seconds ? Math.round(Number(board.seconds)) : null;

  return (
    <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A8A5AD]">Planning model</p>
          <h2 className="mt-1 font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">Storyboard draft</h2>
          <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#8A8790]">
            One explicit request to the configured planning model. No automatic retry. Generation remains a separate approval.
          </p>
        </div>
        <button
          type="button"
          onClick={draft}
          disabled={!signedIn || busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#17131A] px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2A1728] disabled:cursor-not-allowed disabled:bg-[#E9E6EC] disabled:text-[#A8A5AD]"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">dashboard_customize</span>
          {busy ? 'Working…' : board ? 'Draft again' : 'Draft storyboard'}
        </button>
      </div>

      {!signedIn ? (
        <p className="mt-3 rounded-xl border border-[#F5D0E8] bg-[#FFF7FB] px-3 py-2 text-[11px] text-[#8A4B78]">
          <Link href="/sign-in?next=/projects/new" className="font-semibold underline underline-offset-2">Sign in</Link> before using the planning model.
        </p>
      ) : null}

      {error ? <p role="alert" className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] leading-5 text-[#B91C1C]">{error}</p> : null}
      {status ? <p role="status" className="mt-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[11px] leading-5 text-[#166534]">{status}</p> : null}

      {board ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-2.5 py-1 font-mono text-[9px] text-[#5E5A64]">{sceneCount} scenes</span>
            {seconds ? <span className="rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-2.5 py-1 font-mono text-[9px] text-[#5E5A64]">{seconds}s</span> : null}
            <span className={`rounded-full px-2.5 py-1 font-mono text-[9px] font-semibold ${approved ? 'bg-[#F0FDF4] text-[#166534] ring-1 ring-[#BBF7D0]' : 'bg-[#FFFBEB] text-[#B45309] ring-1 ring-[#FDE68A]'}`}>
              {approved ? 'Reviewed' : 'Needs review'}
            </span>
          </div>
          <div className="mt-3 grid gap-2.5">
            {board.storyboard.scenes.map((scene, index) => (
              <SceneRow key={scene.id || index} scene={scene} index={index} />
            ))}
          </div>
          <button
            type="button"
            onClick={approve}
            disabled={busy || approved}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-3.5 py-2 text-[11px] font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A] disabled:cursor-not-allowed disabled:text-[#A8A5AD]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{approved ? 'check_circle' : 'fact_check'}</span>
            {approved ? 'Reviewed draft' : 'Approve this draft'}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[#DDD9E1] bg-[#FAFAFB] px-3.5 py-3">
          <span className="material-symbols-outlined text-[20px] text-[#B8B5BC]" aria-hidden="true">account_tree</span>
          <p className="text-[11px] leading-5 text-[#8A8790]">No storyboard draft in this tab yet. The brief above is the input.</p>
        </div>
      )}
    </section>
  );
}
