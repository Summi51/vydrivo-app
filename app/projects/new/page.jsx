'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StoryboardDraft from '../../../components/StoryboardDraft';
import { readDraft, removeDraft } from '../../../lib/project-draft.js';
import { removeStoryboard } from '../../../lib/storyboard-storage.js';

function Brand() {
  return (
    <Link href="/app" className="inline-flex items-center gap-2.5" aria-label="Vydrivo Creator Studio">
      <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-gradient-to-br from-[#D946EF] via-[#F0839E] to-[#7C3AED] text-white shadow-[0_6px_18px_rgba(217,70,239,0.22)]">
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">play_arrow</span>
      </span>
      <span className="font-headline text-lg font-extrabold tracking-[-0.04em] text-[#17131A]">Vydrivo</span>
    </Link>
  );
}

function MetaChip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1.5 font-mono text-[10px] text-[#6E6974]">
      <span className="material-symbols-outlined text-[14px] text-[#C026D3]" aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}

export default function NewProject() {
  const router = useRouter();
  const [draft, setDraft] = useState(undefined);
  const [signedIn, setSignedIn] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    try {
      setDraft(readDraft(window.sessionStorage));
    } catch {
      setDraft(null);
    }
    let active = true;
    fetch('/api/v1/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setSignedIn(Boolean(payload?.data?.signedIn));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function deleteDraft() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      removeDraft(window.sessionStorage);
      removeStoryboard(window.sessionStorage, draft?.id);
    } finally {
      setDraft(null);
      setConfirming(false);
      router.push('/app');
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] text-[#17131A]">
      <header className="border-b border-[#E7E7EA] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E8] bg-white px-3.5 py-2 text-[11px] font-semibold text-[#5E5A64] transition hover:border-[#D8D5DC] hover:text-[#17131A]"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
              Studio
            </Link>
            <Link href="/" className="hidden text-[11px] font-semibold text-[#8A8790] hover:text-[#17131A] sm:inline">
              Homepage
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C026D3]">Draft review</p>

        {draft === undefined ? (
          <div className="mt-5 h-64 animate-pulse rounded-[26px] border border-[#E7E7EA] bg-white" />
        ) : null}

        {draft === null ? (
          <section className="mt-5 rounded-[26px] border border-dashed border-[#DDD9E1] bg-white px-6 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FCE7F3] text-[#C026D3]">
              <span className="material-symbols-outlined text-[27px]" aria-hidden="true">note_stack</span>
            </span>
            <h1 className="mt-4 font-headline text-2xl font-extrabold tracking-[-0.04em] text-[#17131A]">No draft in this tab</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77747D]">
              Drafts are stored in the browser tab where you created them. A new tab starts empty.
            </p>
            <Link href="/app" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#17131A] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2A1728]">
              Back to Creator Studio
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
            </Link>
          </section>
        ) : null}

        {draft ? (
          <>
            <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div className="min-w-0">
                <h1 className="max-w-3xl font-headline text-3xl font-extrabold leading-[1.05] tracking-[-0.05em] text-[#17131A] sm:text-4xl">{draft.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77747D]">
                  Review the saved brief before any storyboard or footage work begins.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MetaChip icon="bolt">{draft.format || 'Talking head / explainer'}</MetaChip>
                <MetaChip icon="timer">{draft.targetLabel || '60–90s'}</MetaChip>
                <MetaChip icon="aspect_ratio">{draft.aspect || '9:16'} vertical</MetaChip>
                <MetaChip icon="database">Browser-only</MetaChip>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="space-y-4">
                <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A8A5AD]">Your idea</p>
                      <h2 className="mt-1 font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">The brief</h2>
                    </div>
                    <span className="rounded-full border border-[#F5D0E8] bg-[#FFF7FB] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#C026D3]">Draft</span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-[#FAFAFB] p-4 text-[13px] leading-7 text-[#4D4953] ring-1 ring-[#EFEFF1]">
                    {draft.topic}
                  </p>
                  <p className="mt-3 text-[10px] text-[#A8A5AD]">Stored in this browser tab only. It is not an account project and does not have a public URL.</p>
                </section>

                <StoryboardDraft topic={draft.topic} projectId={draft.id} signedIn={signedIn} />

                <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
                  <h2 className="font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">What happens next</h2>
                  <ol className="mt-4 space-y-3">
                    {[
                      ['1', 'Shape the storyboard', 'Turn the brief into scene cards with narration, visual intent, and measured timing.'],
                      ['2', 'Review every scene', 'Change a line or a shot, then approve a precise revision before generation.'],
                      ['3', 'Generate and export', 'Footage, narration, and captions are composed into a vertical MP4 only after approval.'],
                    ].map(([number, title, body], index) => (
                      <li key={number} className="flex gap-3">
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold ${index === 0 ? 'bg-[#FCE7F3] text-[#C026D3]' : 'bg-[#F4F4F6] text-[#A8A5AD]'}`}>{number}</span>
                        <div>
                          <p className="text-xs font-semibold text-[#2A1728]">{title}</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-[#8A8790]">{body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5">
                    <span className="material-symbols-outlined text-[16px] text-[#B45309]" aria-hidden="true">lock</span>
                    <p className="text-[11px] leading-5 text-[#8A6A2F]">
                      Footage generation, rendering, and export are not connected in this build. Storyboard drafting is a single explicit request when the operator has enabled the planning model.
                    </p>
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)]">
                  <h2 className="font-headline text-sm font-bold tracking-[-0.02em] text-[#17131A]">Draft details</h2>
                  <dl className="mt-3 space-y-3 text-[11px]">
                    {[
                      ['Format', draft.format || 'Talking head / explainer'],
                      ['Target', draft.targetLabel || '60–90s'],
                      ['Output', `${draft.aspect || '9:16'} vertical · 1080 × 1920`],
                      ['Created', draft.createdAt ? new Date(draft.createdAt).toLocaleString() : 'Just now'],
                      ['Persistence', 'This browser tab'],
                    ].map(([term, value]) => (
                      <div key={term} className="flex items-start justify-between gap-3 border-b border-[#F2F1F4] pb-2.5 last:border-0 last:pb-0">
                        <dt className="text-[#A8A5AD]">{term}</dt>
                        <dd className="max-w-[60%] text-right font-medium text-[#4D4953]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <div className="flex flex-col gap-2">
                  <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-[#E9E6EC] px-4 py-2.5 text-xs font-semibold text-[#A8A5AD]" title="Live footage generation is not connected in this local build.">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">lock</span>
                    Generate video — not connected
                  </button>
                  <Link href={`/app/projects/${draft.id}`} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-4 py-2.5 text-xs font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A]">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">dashboard_customize</span>
                    Open storyboard workspace
                  </Link>
                  <Link href="/app" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-4 py-2.5 text-xs font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A]">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
                    Back to studio
                  </Link>
                  <button
                    type="button"
                    onClick={deleteDraft}
                    className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      confirming ? 'bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-[#FECACA]' : 'text-[#A8A5AD] hover:bg-[#FAFAFB] hover:text-[#B91C1C]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">delete</span>
                    {confirming ? 'Click again to delete this draft' : 'Delete draft'}
                  </button>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
