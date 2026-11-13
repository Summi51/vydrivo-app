'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CURRENT_PROJECT_KEY, getProject } from '../../lib/projects-client.js';
import { apiRequest } from '../../lib/session-fetch.js';
import ProjectSteps from './workspace/ProjectSteps';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function graphicsStateLabel(state) {
  if (state === 'queued') return 'Queued…';
  if (state === 'translating') return 'Translating the approved storyboard…';
  if (state === 'generating-narration') return 'Generating narration…';
  if (state === 'rendering') return 'Rendering diagrams and video…';
  if (state === 'done') return 'Video ready';
  if (state === 'error') return 'Render failed';
  return 'Starting…';
}

export default function VideoWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [graphicsLanguage, setGraphicsLanguage] = useState('hindi');
  const [graphicsVoice, setGraphicsVoice] = useState('male');
  const [graphicsJob, setGraphicsJob] = useState(null);
  const [graphicsError, setGraphicsError] = useState('');
  const [graphicsStarting, setGraphicsStarting] = useState(false);
  const graphicsBusy = graphicsStarting || ['queued', 'translating', 'generating-narration', 'rendering'].includes(graphicsJob?.state);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await getProject(projectId);
        if (!active) return;
        setProject(current);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || 'Could not load this project.');
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

  useEffect(() => {
    if (!project?.id) return undefined;
    let active = true;
    (async () => {
      try {
        const response = await apiRequest(`/api/v1/projects/${project.id}/graphics-render`);
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload?.data?.runId) setGraphicsJob(payload.data);
      } catch {
        // No previous graphics render; the start action remains available.
      }
    })();
    return () => { active = false; };
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id || !graphicsJob?.runId || ['done', 'error'].includes(graphicsJob.state)) return undefined;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await apiRequest(`/api/v1/projects/${project.id}/graphics-render?runId=${encodeURIComponent(graphicsJob.runId)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload?.data) setGraphicsJob(payload.data);
      } catch {
        // Keep the last status; the next poll retries.
      }
    }, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [project?.id, graphicsJob?.runId, graphicsJob?.state]);

  async function startGraphicsRender() {
    if (!project || graphicsStarting) return;
    setGraphicsStarting(true);
    setGraphicsError('');
    try {
      const response = await apiRequest(`/api/v1/projects/${project.id}/graphics-render`, {
        method: 'POST',
        body: { language: graphicsLanguage, voice: graphicsVoice },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not start the graphics render.');
      setGraphicsJob({ ...payload.data, state: 'queued', progress: 0 });
      window.sessionStorage.setItem(`vydrivo.graphics-run.${project.id}`, payload.data.runId);
    } catch (error) {
      setGraphicsError(error.message || 'Could not start the graphics render.');
    } finally {
      setGraphicsStarting(false);
    }
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} storyboardApproved={false} sectionLabel="Video" purpleAmbient>
        <div className="h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419] sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} storyboardApproved={false} sectionLabel="Video" purpleAmbient>
        <section className="rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">folder_off</span>
          </span>
          <h1 className="mt-4 font-landing text-2xl font-bold tracking-[-0.04em] text-[#F5F5F7]">Project not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">
            {loadError || 'This project was not found, or your account does not have access to it.'}
          </p>
          <Link
            href="/app/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to Studio Projects
          </Link>
        </section>
      </StudioShell>
    );
  }

  const scenes = Array.isArray(project.storyboard?.scenes) ? project.storyboard.scenes : [];
  const seconds = scenes.reduce((total, scene) => total + (Number(scene.estimatedSeconds) || 0), 0);
  const approved = project.review?.approved === true;

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} storyboardApproved={approved} sectionLabel="Video" purpleAmbient>
      <ProjectSteps projectId={project.id} active="video" storyboardApproved={approved} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-2xl font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] text-balance sm:text-[36px]">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className={`inline-flex items-center gap-1.5 ${approved ? 'text-[#6EE7B7]' : 'text-[#FCD34D]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`} aria-hidden="true" />
              {approved ? 'Storyboard approved' : 'Approval required'}
            </span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{scenes.length} scenes</span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{formatDuration(seconds)}</span>
          </div>
          <p className="mt-1 text-[12px] text-[#5F5F6B]">
            {project.format} · {project.targetLabel} · {project.aspect}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${project.id}`}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">dashboard_customize</span>
            Back to storyboard
          </Link>
        </div>
      </div>

      {!approved ? (
        <section className="mt-5 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5 sm:p-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCD34D]">Approval required</p>
          <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Approve the storyboard before rendering.</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Rendering is gated on the exact approved revision. Review every scene, fix the validation warnings, then approve the storyboard.
          </p>
          <Link
            href={`/app/projects/${project.id}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Review storyboard
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      ) : (
        <section className="studio-surface mt-5 rounded-3xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Free graphics video</p>
                    <h2 className="mt-1 font-landing text-2xl font-bold tracking-[-0.035em] text-[#F5F5F7]">Render the approved storyboard with diagrams.</h2>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#9A9AA5]">
                      Approved scenes, Hindi/English narration and clean diagrams in a vertical MP4.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#C4B5FD]">
                    Motion graphics
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[150px_150px_auto] sm:items-end">
                  <label className="block">
                    <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Language</span>
                    <select
                      value={graphicsLanguage}
                      onChange={(event) => setGraphicsLanguage(event.target.value)}
                      disabled={graphicsBusy}
                      className="mt-1 w-full rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] disabled:opacity-50"
                    >
                      <option value="hindi">Hindi</option>
                      <option value="english">English</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Voice</span>
                    <select
                      value={graphicsVoice}
                      onChange={(event) => setGraphicsVoice(event.target.value)}
                      disabled={graphicsBusy}
                      className="mt-1 w-full rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] disabled:opacity-50"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={startGraphicsRender}
                    disabled={graphicsBusy}
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
                    {graphicsBusy ? 'Rendering…' : 'Render video'}
                  </button>
                </div>

                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">
                  1080×1920 · 60–90s · H.264/AAC
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/projects/${project.id}/video/scenes`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit_note</span>
                    Edit scene text
                  </Link>
                  <span className="text-[11px] text-[#5F5F6B]">Hinglish screen text and Hindi voice, before rendering.</span>
                </div>

                {graphicsError ? (
                  <p role="alert" className="mt-3 rounded-lg border border-[#F87171]/35 bg-[#F87171]/10 px-3 py-2 text-[13px] leading-5 text-[#FCA5A5]">{graphicsError}</p>
                ) : null}

                {graphicsJob?.state === 'error' ? (
                  <p role="alert" className="mt-3 rounded-lg border border-[#F87171]/35 bg-[#F87171]/10 px-3 py-2 text-[13px] leading-5 text-[#FCA5A5]">
                    {graphicsJob.message || 'The render failed. Please try again.'}
                  </p>
                ) : null}

                {graphicsJob?.state === 'done' ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6EE7B7]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" aria-hidden="true" />
                    Video ready
                  </p>
                ) : null}
              </div>

              <div className="mx-auto w-full max-w-[300px] lg:mx-0">
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-[#2B2B35] bg-[#0B0B0F]">
                  {graphicsJob?.state === 'done' && graphicsJob.outputUrl ? (
                    <video controls src={graphicsJob.outputUrl} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                      <span className="material-symbols-outlined text-[30px] text-[#5F5F6B]" aria-hidden="true">smart_display</span>
                      <p className="text-[12px] leading-5 text-[#777781]">Your video preview appears here.</p>
                    </div>
                  )}
                  {graphicsBusy ? (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061426] to-transparent p-4">
                      <p className="text-[12px] font-semibold text-[#C4B5FD]">{graphicsStateLabel(graphicsJob?.state)}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#26262E]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={graphicsJob?.progress || 0}>
                        <div className="h-full rounded-full bg-[#8B5CF6] transition-all" style={{ width: `${graphicsJob?.progress || 0}%` }} />
                      </div>
                      <p className="mt-1 text-right font-mono text-[11px] text-[#777781]">{graphicsJob?.progress || 0}%</p>
                    </div>
                  ) : null}
                </div>
                {graphicsJob?.state === 'done' && graphicsJob.outputUrl ? (
                  <a href={graphicsJob.outputUrl} download className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] hover:text-white">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                    Download MP4
                  </a>
                ) : null}
              </div>
            </div>
        </section>
      )}
    </StudioShell>
  );
}
