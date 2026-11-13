'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createScene, duplicateScene, validateStoryboardDraft } from '../../lib/storyboard-editor.js';
import { createSerialQueue } from '../../lib/serial-queue.js';
import { storyboardRequest } from '../../lib/storyboard-client.js';
import { CURRENT_PROJECT_KEY, getProject, isProjectConflict, saveProjectStoryboard } from '../../lib/projects-client.js';
import { listMediaAssets } from '../../lib/media-client.js';
import ConflictNotice from './workspace/ConflictNotice';
import ProjectSteps from './workspace/ProjectSteps';
import SceneEditor from './workspace/SceneEditor';
import SceneRail from './workspace/SceneRail';
import StoryboardInspector from './workspace/StoryboardInspector';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function StoryboardWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState([]);
  const [review, setReview] = useState({ approved: false, storyboardHash: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [referenceAssets, setReferenceAssets] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState('');
  const [conflict, setConflict] = useState(null);
  const [conflictBusy, setConflictBusy] = useState(false);
  const hydrated = useRef(false);
  const saveSeq = useRef(0);
  const skipNextSave = useRef(true);
  const projectRef = useRef(null);
  const writeQueue = useRef(null);
  if (!writeQueue.current) writeQueue.current = createSerialQueue();

  function resetReview() {
    setReview({ approved: false, storyboardHash: '' });
    setSaveStatus('saving');
  }

  function applyProject(current) {
    projectRef.current = current;
    setProject(current);
  }

  function applyServerStoryboard(current) {
    const savedScenes = Array.isArray(current.storyboard?.scenes) ? current.storyboard.scenes : [];
    setTitle(current.storyboard?.title || current.title);
    setScenes(savedScenes);
    setReview(current.review || { approved: false, storyboardHash: '' });
    setSelectedId(savedScenes[0]?.id || null);
  }

  useEffect(() => {
    skipNextSave.current = true;
    let active = true;
    setReferenceAssets([]);
    setReferenceLoading(true);
    setReferenceError('');
    (async () => {
      try {
        const current = await getProject(projectId);
        if (!active) return;
        applyProject(current);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
        const savedScenes = Array.isArray(current.storyboard?.scenes) ? current.storyboard.scenes : [];
        applyServerStoryboard(current);
        setSaveStatus(savedScenes.length ? 'saved' : 'idle');
        hydrated.current = true;
        try {
          const media = await listMediaAssets(current.id);
          if (!active) return;
          setReferenceAssets((media.assets || []).filter((asset) => asset.kind === 'reference' && asset.status === 'validated'));
          setReferenceError('');
        } catch (mediaError) {
          if (!active) return;
          setReferenceAssets([]);
          setReferenceError(mediaError.message || 'Reference media is unavailable.');
        } finally {
          if (active) setReferenceLoading(false);
        }
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || 'Could not load this project.');
        projectRef.current = null;
        setProject(null);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => validateStoryboardDraft({ title, scenes }), [title, scenes]);
  const approved = review?.approved === true;
  const selectedIndex = Math.max(0, scenes.findIndex((scene) => scene.id === selectedId));
  const selectedScene = scenes.find((scene) => scene.id === selectedId) || scenes[0] || null;

  useEffect(() => {
    if (scenes.length && !scenes.some((scene) => scene.id === selectedId)) {
      setSelectedId(scenes[0].id);
    }
    if (!scenes.length && selectedId) setSelectedId(null);
  }, [scenes, selectedId]);

  function storyboardPayload() {
    return scenes.length
      ? { schemaVersion: 1, title: (title || project?.title || 'Untitled storyboard').trim(), scenes }
      : null;
  }

  useEffect(() => {
    if (!hydrated.current || !project) return undefined;
    if (conflict) return undefined;
    if (review.approved) {
      skipNextSave.current = false;
      return undefined;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      const sequence = ++saveSeq.current;
      const payload = storyboardPayload();
      setSaveStatus('saving');
      try {
        const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
          storyboard: payload,
          approved: false,
          baseUpdatedAt: projectRef.current?.updatedAt,
        }));
        // Keep the version current even when a newer save superseded this one.
        projectRef.current = saved;
        if (sequence !== saveSeq.current) return;
        applyProject(saved);
        setSaveStatus('saved');
        setConflict(null);
      } catch (error) {
        if (sequence !== saveSeq.current) return;
        if (isProjectConflict(error)) {
          setConflict(error.details?.project || projectRef.current);
          setSaveStatus('conflict');
          return;
        }
        setSaveStatus('error');
        setNotice(error.message || 'Could not save this storyboard.');
      }
    }, 500);
    return () => window.clearTimeout(timer);
    // storyboardPayload is derived from title/scenes/project; the dependency list is the autosave input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, title, scenes, review.approved, conflict]);

  async function saveNow() {
    if (!project) return;
    const sequence = ++saveSeq.current;
    const payload = storyboardPayload();
    const approved = review.approved === true;
    setSaveStatus('saving');
    try {
      const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
        storyboard: payload,
        approved,
        baseUpdatedAt: projectRef.current?.updatedAt,
      }));
      projectRef.current = saved;
      if (sequence !== saveSeq.current) return;
      applyProject(saved);
      setReview(saved.review);
      setSaveStatus('saved');
      setConflict(null);
      setNotice('Storyboard saved.');
    } catch (error) {
      if (sequence !== saveSeq.current) return;
      if (isProjectConflict(error)) {
        setConflict(error.details?.project || projectRef.current);
        setSaveStatus('conflict');
        setNotice('This project changed somewhere else. Reload it or save your edits over it.');
        return;
      }
      setSaveStatus('error');
      setNotice(error.message || 'Could not save this storyboard.');
    }
  }

  function reloadConflict() {
    if (!conflict) return;
    skipNextSave.current = true;
    applyProject(conflict);
    applyServerStoryboard(conflict);
    setConflict(null);
    setSaveStatus(conflict.storyboard?.scenes?.length ? 'saved' : 'idle');
    setNotice('Loaded the latest saved version.');
  }

  async function keepMineOverConflict() {
    if (!conflict || conflictBusy) return;
    setConflictBusy(true);
    const sequence = ++saveSeq.current;
    try {
      const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
        storyboard: storyboardPayload(),
        approved: false,
        baseUpdatedAt: conflict.updatedAt,
      }));
      if (sequence !== saveSeq.current) return;
      applyProject(saved);
      setReview(saved.review);
      setSaveStatus('saved');
      setConflict(null);
      setNotice('Your edits were saved over the newer version. Approve the revision again.');
    } catch (error) {
      if (isProjectConflict(error)) {
        setConflict(error.details?.project || conflict);
        setNotice('The project changed again. Reload it before saving.');
      } else {
        setSaveStatus('error');
        setNotice(error.message || 'Could not save this storyboard.');
      }
    } finally {
      setConflictBusy(false);
    }
  }

  function updateScene(patch) {
    if (!selectedScene) return;
    setScenes((current) => current.map((scene) => (scene.id === selectedScene.id ? { ...scene, ...patch } : scene)));
    resetReview();
  }

  function addScene() {
    const scene = createScene(scenes);
    setScenes((current) => [...current, scene]);
    setSelectedId(scene.id);
    resetReview();
  }

  function duplicateSelected() {
    if (!selectedScene) return;
    const copy = duplicateScene(selectedScene, scenes);
    if (!copy) return;
    const index = scenes.findIndex((scene) => scene.id === selectedScene.id);
    setScenes((current) => [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]);
    setSelectedId(copy.id);
    resetReview();
  }

  function deleteSelected() {
    if (!selectedScene) return;
    const index = scenes.findIndex((scene) => scene.id === selectedScene.id);
    const next = scenes.filter((scene) => scene.id !== selectedScene.id);
    setScenes(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id || null);
    resetReview();
  }

  function moveSelected(direction) {
    if (!selectedScene) return;
    const index = scenes.findIndex((scene) => scene.id === selectedScene.id);
    const target = index + direction;
    if (target < 0 || target >= scenes.length) return;
    const next = [...scenes];
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
    resetReview();
  }

  async function approve() {
    if (!project) return;
    if (!stats.ok) {
      setNotice(stats.errors[0] || 'Fix the storyboard checks before approval.');
      return;
    }
    setApproving(true);
    setNotice('');
    saveSeq.current += 1;
    const payload = storyboardPayload();
    try {
      const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
        storyboard: payload,
        approved: true,
        baseUpdatedAt: projectRef.current?.updatedAt,
      }));
      applyProject(saved);
      setReview(saved.review);
      setSaveStatus('saved');
      setConflict(null);
      setNotice('This exact storyboard revision is approved. Generation is still gated.');
    } catch (error) {
      if (isProjectConflict(error)) {
        setConflict(error.details?.project || projectRef.current);
        setSaveStatus('conflict');
        setNotice('This project changed somewhere else. Reload it before approving.');
      } else {
        setNotice(error.message || 'Storyboard approval failed.');
      }
    } finally {
      setApproving(false);
    }
  }

  async function runGenerate() {
    if (!project || generating) return;
    setConfirmGenerate(false);
    setGenerating(true);
    setGenerateError('');
    try {
      const brief = [
        project.topic,
        project.audience ? `Audience: ${project.audience}` : '',
        project.notes ? `Notes:\n${project.notes}` : '',
      ].filter(Boolean).join('\n\n').slice(0, 13000);
      const data = await storyboardRequest('POST', { topic: brief });
      const nextScenes = data.storyboard?.scenes || [];
      if (!nextScenes.length) throw new Error('The planner returned no scenes.');
      setTitle(data.storyboard?.title || project.title);
      setScenes(nextScenes);
      setReview({ approved: false, storyboardHash: '' });
      setSelectedId(nextScenes[0]?.id || null);
      setSaveStatus('saving');
      const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
        storyboard: data.storyboard,
        approved: false,
        baseUpdatedAt: projectRef.current?.updatedAt,
      }));
      applyProject(saved);
      setSaveStatus('saved');
      setConflict(null);
      setNotice(`Storyboard candidate generated with ${nextScenes.length} scenes. Review every scene before approval.`);
    } catch (error) {
      if (isProjectConflict(error)) {
        setConflict(error.details?.project || projectRef.current);
        setSaveStatus('conflict');
        setGenerateError('The candidate was generated but not saved because the project changed somewhere else. Choose “Save mine over it” or reload the latest version.');
        return;
      }
      setGenerateError(error.message || 'Storyboard generation failed.');
      setNotice(error.message || 'Storyboard generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  function generateStoryboard() {
    if (!project || generating) return;
    if (scenes.length) {
      setConfirmGenerate(true);
      return;
    }
    runGenerate();
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice} stage={1} sectionLabel="Storyboard">
        <div className="h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419] sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice} stage={1} sectionLabel="Storyboard">
        <section className="rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">folder_off</span>
          </span>
          <h1 className="mt-4 font-landing text-2xl font-bold tracking-[-0.04em] text-[#F5F5F7]">Project not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#9A9AA5]">
            {loadError || 'This project was not found, or your account does not have access to it.'}
          </p>
          <Link
            href="/app/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[14px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to Studio Projects
          </Link>
        </section>
      </StudioShell>
    );
  }

  const statusLabel = !scenes.length ? 'Draft' : approved ? 'Approved' : stats.ok ? 'Needs approval' : 'Draft';
  const statusClass = approved
    ? 'border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]'
    : scenes.length
      ? 'border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FCD34D]'
      : 'border-[#26262E] bg-[#0B0B0F] text-[#9A9AA5]';
  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Autosaved' : saveStatus === 'conflict' ? 'Needs reload' : saveStatus === 'error' ? 'Save failed' : 'Not saved';
  const saveDot = saveStatus === 'saved' ? 'bg-[#34D399]' : saveStatus === 'error' || saveStatus === 'conflict' ? 'bg-[#F87171]' : 'bg-[#FBBF24]';

  function selectPrevious() {
    if (selectedIndex > 0) setSelectedId(scenes[selectedIndex - 1].id);
  }

  function selectNext() {
    if (selectedIndex < scenes.length - 1) setSelectedId(scenes[selectedIndex + 1].id);
  }

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice} stage={1} sectionLabel="Storyboard">
      <ProjectSteps projectId={project.id} active="storyboard" storyboardApproved={approved} />
      <ConflictNotice conflict={conflict} onReload={reloadConflict} onKeep={keepMineOverConflict} busy={conflictBusy} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-xl font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] text-balance sm:text-[36px]">
            {title || project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em]">
            <span className="inline-flex items-center gap-1.5 text-[#9A9AA5]" aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${saveDot}`} aria-hidden="true" />
              {saveLabel === 'Autosaved' ? 'Saved' : saveLabel}
            </span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{scenes.length} scenes</span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{formatDuration(stats.totalSeconds)}</span>
            <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusClass}`}>{statusLabel}</span>
          </div>
          <p className="mt-1 text-[14px] text-[#5F5F6B]">
            {project.format} · {project.targetLabel} · {project.aspect}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generateStoryboard}
            disabled={generating || !project.topic}
            title={project.topic ? 'Draft a storyboard candidate from the saved topic.' : 'Add a topic in the idea step first.'}
            className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              scenes.length
                ? 'border border-[#2B2B35] bg-[#141419] text-[#9A9AA5] hover:border-[#8B5CF6]/50 hover:text-[#F5F5F7]'
                : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
            {generating ? 'Generating…' : scenes.length ? 'Generate another' : 'Generate storyboard'}
          </button>
          <Link
            href={`/app/projects/${project.id}/idea`}
            className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#2B2B35] bg-[#141419] px-3 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit_note</span>
            Edit idea
          </Link>
          <button
            type="button"
            onClick={saveNow}
            disabled={!scenes.length}
            className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#2B2B35] bg-[#141419] px-3 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">save</span>
            Save draft
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={!stats.ok || approved || approving}
            title={!stats.ok ? (stats.errors[0] || 'Fix the storyboard checks first.') : approved ? 'This revision is approved.' : 'Approve this exact revision.'}
            className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#8B5CF6] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:bg-[#1B1B22] disabled:text-[#5F5F6B]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{approved ? 'check_circle' : 'fact_check'}</span>
            {approved ? 'Approved' : approving ? 'Approving…' : 'Approve storyboard'}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3.5 py-3 text-[14px] text-[#C4B5FD]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8B5CF6]" aria-hidden="true" />
          Drafting a storyboard candidate from your saved topic. This can take a moment.
        </div>
      ) : null}
      {generateError ? (
        <p role="alert" className="mt-4 rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-3.5 py-3 text-[14px] leading-6 text-[#FCA5A5]">
          {generateError}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <SceneRail scenes={scenes} selectedId={selectedScene?.id || null} onSelect={setSelectedId} onAdd={addScene} />
        <SceneEditor
          project={project}
          scene={selectedScene}
          index={selectedIndex}
          total={scenes.length}
          referenceAssets={referenceAssets}
          referenceLoading={referenceLoading}
          referenceError={referenceError}
          onAdd={addScene}
          onGenerate={generateStoryboard}
          generating={generating}
          onChange={updateScene}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onMove={moveSelected}
        />
        <StoryboardInspector
          project={project}
          stats={stats}
          review={review}
          onApprove={approve}
          approving={approving}
          canApprove={stats.ok && !approved && !approving}
        />
      </div>

      <div className="z-20 mt-5 rounded-xl border border-[#26262E] bg-[#0F0F14]/95 px-3 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-[#9A9AA5]">
            <span className={`h-1.5 w-1.5 rounded-full ${saveDot}`} aria-hidden="true" />
            {saveStatus === 'saved' ? 'Autosaved' : saveLabel}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectPrevious}
              disabled={!scenes.length || selectedIndex <= 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#2B2B35] bg-[#141419] px-2.5 py-1.5 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_left</span>
              Previous scene
            </button>
            <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#5F5F6B]">
              Scene {scenes.length ? selectedIndex + 1 : 0} of {scenes.length}
            </span>
            <button
              type="button"
              onClick={selectNext}
              disabled={!scenes.length || selectedIndex >= scenes.length - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[#2B2B35] bg-[#141419] px-2.5 py-1.5 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next scene
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
            </button>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B] lg:inline">
              {approved ? 'Approved revision' : 'Requires approval'}
            </span>
            {approved ? (
              <Link
                href={`/app/projects/${project.id}/video`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
              >
                Continue to video
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title="Approve the storyboard revision first."
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B1B22] px-3 py-1.5 text-[13px] font-semibold text-[#5F5F6B]"
              >
                Continue to video
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmGenerate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="generate-storyboard-title" className="w-full max-w-md rounded-2xl border border-[#26262E] bg-[#141419] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">New candidate</p>
            <h2 id="generate-storyboard-title" className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">
              Generate another storyboard?
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#9A9AA5]">
              This replaces the current {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'} and resets approval. Saved candidate history is not connected yet.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmGenerate(false)}
                className="rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[14px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runGenerate}
                className="rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-[14px] font-semibold text-white transition hover:bg-[#7C3AED]"
              >
                Generate candidate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioShell>
  );
}
