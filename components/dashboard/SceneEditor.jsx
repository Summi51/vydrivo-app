'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProject } from '../../lib/projects-client.js';
import { apiRequest } from '../../lib/session-fetch.js';
import StudioShell from './StudioShell';

const DIAGRAM_OPTIONS = [
  ['statement', 'Statement / hook'],
  ['steps', 'Steps'],
  ['compare', 'Compare'],
  ['checklist', 'Checklist'],
  ['timeline', 'Timeline'],
  ['recap', 'Recap'],
  ['problem-fix', 'Problem → Fix'],
  ['cause-effect', 'Cause → Effect'],
  ['big-number', 'Big number'],
  ['cycle', 'Cycle / loop'],
];

function when(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'just now';
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(timestamp).toLocaleDateString();
}

function SceneFields({ scene, index, onChange }) {
  const labels = Array.from({ length: 4 }, (_, labelIndex) => scene.labels?.[labelIndex] || '');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#777781]">Scene {String(index + 1).padStart(2, '0')}</p>
          <p className="mt-1 font-mono text-[11px] text-[#5F5F6B]">ID: {scene.id}</p>
        </div>
        <span className="rounded-full border border-[#2B2B35] bg-[#0B0B0F] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C4B5FD]">
          {scene.diagram}
        </span>
      </div>

      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">On-screen title</span>
        <input
          type="text"
          value={scene.headline}
          maxLength={44}
          onChange={(event) => onChange({ headline: event.target.value })}
          className="mt-1 w-full rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2.5 text-[14px] text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6]"
        />
        <span className="mt-1 block text-[11px] text-[#5F5F6B]">{scene.headline.length}/44 · shown at the top of the scene</span>
      </label>

      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Diagram</span>
        <select
          value={scene.diagram}
          onChange={(event) => onChange({ diagram: event.target.value })}
          className="mt-1 w-full rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2.5 text-[14px] text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6]"
        >
          {DIAGRAM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Diagram labels</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {labels.map((label, labelIndex) => (
            <input
              key={labelIndex}
              type="text"
              value={label}
              maxLength={32}
              placeholder={`Label ${labelIndex + 1}${labelIndex < 2 ? ' (required)' : ' (optional)'}`}
              onChange={(event) => {
                const next = [...labels];
                next[labelIndex] = event.target.value;
                onChange({ labels: next });
              }}
              className="w-full rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2 text-[13px] text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6]"
            />
          ))}
        </div>
        <span className="mt-1 block text-[11px] text-[#5F5F6B]">Use 2–4 short labels, up to 32 characters each.</span>
      </div>

      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">On-screen caption (Hinglish)</span>
        <textarea
          value={scene.displayNarration}
          maxLength={700}
          rows={3}
          onChange={(event) => onChange({ displayNarration: event.target.value })}
          className="mt-1 w-full resize-y rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2.5 text-[14px] leading-6 text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6]"
        />
        <span className="mt-1 block text-[11px] text-[#5F5F6B]">Full-sentence captions with the current phrase highlighted. Keep it close to the voice timing.</span>
      </label>

      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Voice narration (Hindi, Devanagari)</span>
        <textarea
          value={scene.narration}
          maxLength={700}
          rows={3}
          onChange={(event) => onChange({ narration: event.target.value })}
          className="mt-1 w-full resize-y rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2.5 text-[14px] leading-6 text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6]"
        />
        <span className="mt-1 block text-[11px] text-[#5F5F6B]">This is what the Hindi voice speaks. Changing it changes the voice on the next render.</span>
      </label>
    </div>
  );
}

export default function SceneEditor({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [script, setScript] = useState(undefined);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingError, setLoadingError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let current;
      try {
        current = await getProject(projectId);
      } catch (loadError) {
        if (!alive) return;
        setLoadingError(loadError.message || 'Could not load this project.');
        setProject(null);
        setScript(null);
        return;
      }
      if (!alive) return;
      setProject(current);
      if (current.review?.approved !== true) {
        setScript(null);
        return;
      }
      try {
        const response = await apiRequest(`/api/v1/projects/${projectId}/graphics-script`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Could not load scene text.');
        const next = payload.data?.script || null;
        if (!alive) return;
        setScript(next);
        setSelectedId(next?.scenes?.[0]?.id || null);
      } catch (scriptError) {
        if (!alive) return;
        setError(scriptError.message || 'Could not load scene text.');
        setScript(null);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedIndex = Math.max(0, script?.scenes?.findIndex((scene) => scene.id === selectedId) ?? 0);
  const selected = script?.scenes?.[selectedIndex] || script?.scenes?.[0] || null;

  function updateSelected(patch) {
    if (!selected) return;
    setScript((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => (scene.id === selected.id ? { ...scene, ...patch } : scene)),
    }));
    setDirty(true);
    setError('');
  }

  async function prepare() {
    setPreparing(true);
    setError('');
    try {
      const response = await apiRequest(`/api/v1/projects/${projectId}/graphics-script`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not prepare scene text.');
      setScript(payload.data.script);
      setSelectedId(payload.data.script?.scenes?.[0]?.id || null);
      setDirty(false);
      setNotice('Scene text prepared from the approved storyboard.');
    } catch (prepareError) {
      setError(prepareError.message || 'Could not prepare scene text.');
    } finally {
      setPreparing(false);
    }
  }

  async function save() {
    if (!script || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await apiRequest(`/api/v1/projects/${projectId}/graphics-script`, {
        method: 'PUT',
        body: { script },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not save scene text.');
      setScript(payload.data.script);
      setDirty(false);
      setNotice('Scene text saved. The next render will use these edits.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save scene text.');
    } finally {
      setSaving(false);
    }
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} sectionLabel="Scene text" purpleAmbient>
        <div className="h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419] sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} sectionLabel="Scene text" purpleAmbient>
        <section className="rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">folder_off</span>
          </span>
          <h1 className="mt-4 font-landing text-2xl font-bold tracking-[-0.04em] text-[#F5F5F7]">Project not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">{loadingError || 'This project was not found, or your account does not have access to it.'}</p>
          <Link href="/app/projects" className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50">
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to Projects
          </Link>
        </section>
      </StudioShell>
    );
  }

  const approved = project.review?.approved === true;

  return (
    <StudioShell
      user={user}
      onNew={() => router.push('/app#create-video')}
      notice={notice}
      stage={2}
      storyboardApproved={approved}
      sectionLabel="Scene text"
      purpleAmbient
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">Video / Scene text</p>
          <h1 className="mt-2 font-landing text-[26px] font-bold leading-[1.05] tracking-[-0.05em] text-[#F5F5F7] sm:text-[32px]">Scene text</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Edit the Hinglish screen text, diagram and Hindi voice narration before rendering. Nothing is generated on this page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${project.id}/video`}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
            Back to video
          </Link>
          {script ? (
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          ) : null}
        </div>
      </div>

      {!approved ? (
        <section className="mt-5 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5 sm:p-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCD34D]">Approval required</p>
          <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Approve the storyboard before editing scene text.</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">Scene text is tied to the exact approved revision. Review and approve the storyboard first.</p>
          <Link href={`/app/projects/${project.id}`} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]">
            Review storyboard
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      ) : script === undefined ? (
        <div className="mt-5 h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419]" />
      ) : script === null ? (
        <section className="mt-5 rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/5 p-5 sm:p-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Scene text</p>
          <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Prepare the on-screen text.</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            This turns the approved storyboard into Hinglish screen text, diagram labels and Hindi voice narration. It uses the free AI text gateway; no voice or video credits are used.
          </p>
          <button
            type="button"
            onClick={prepare}
            disabled={preparing}
            className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
            {preparing ? 'Preparing…' : 'Prepare scene text'}
          </button>
        </section>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px]">
            <span className={dirty ? 'text-[#FCD34D]' : 'text-[#6EE7B7]'}>
              {dirty ? 'Unsaved changes' : `Saved ${when(script.updatedAt)}`}
            </span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#777781]">{script.scenes.length} scenes</span>
            {script.sourceRunId ? (
              <>
                <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
                <span className="text-[#777781]">Seeded from the latest render</span>
              </>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-[#26262E] bg-[#141419] p-2">
              <p className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#777781]">Scenes</p>
              <div className="max-h-[560px] space-y-1 overflow-y-auto">
                {script.scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setSelectedId(scene.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                      scene.id === selected?.id
                        ? 'bg-[#1B1B22] text-[#F5F5F7] ring-1 ring-[#8B5CF6]/30'
                        : 'text-[#9A9AA5] hover:bg-white/[0.04] hover:text-[#F5F5F7]'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[#5F5F6B]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="truncate">{scene.headline}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl border border-[#26262E] bg-[#141419] p-4 sm:p-6">
              {selected ? (
                <SceneFields scene={selected} index={selectedIndex} onChange={updateSelected} />
              ) : (
                <p className="text-[13px] text-[#9A9AA5]">Choose a scene to edit.</p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#26262E] pt-4">
                <p className="text-[11px] leading-5 text-[#5F5F6B]">Saving changes does not render a video or use voice credits.</p>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !dirty}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">save</span>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-[#F87171]/35 bg-[#F87171]/10 px-3 py-2 text-[13px] leading-5 text-[#FCA5A5]">{error}</p>
      ) : null}
    </StudioShell>
  );
}
