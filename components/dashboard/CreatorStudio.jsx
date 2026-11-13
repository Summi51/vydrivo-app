'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CURRENT_PROJECT_KEY,
  getProject,
  listProjects,
  projectStoryboardSummary,
} from '../../lib/projects-client.js';
import { apiRequest } from '../../lib/session-fetch.js';
import CreateVideoHero from './CreateVideoHero';
import DashboardSections from './DashboardSections';
import StudioShell from './StudioShell';

function draftFromProject(project) {
  if (!project) return null;
  return {
    id: project.id,
    title: project.title,
    topic: project.topic,
    format: project.format,
    formatId: project.formatId,
    targetSeconds: project.targetSeconds,
    targetLabel: project.targetLabel,
    aspect: project.aspect,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    persistence: 'postgres',
  };
}

function storyboardFromProject(project) {
  if (!project?.storyboard?.scenes?.length) return null;
  const summary = projectStoryboardSummary(project);
  return {
    storyboard: project.storyboard,
    review: project.review,
    sceneCount: summary.sceneCount,
    seconds: summary.seconds,
    persistence: 'postgres',
  };
}

export default function CreatorStudio({ user }) {
  const [project, setProject] = useState(undefined);
  const [projects, setProjects] = useState([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [videosByProject, setVideosByProject] = useState({});
  const [status, setStatus] = useState('loading');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProject() {
      try {
        const [data, videoResponse] = await Promise.all([
          listProjects({ limit: 20 }),
          apiRequest('/api/v1/videos').catch(() => null),
        ]);
        if (!active) return;
        const videoMap = {};
        if (videoResponse?.ok) {
          const videoPayload = await videoResponse.json().catch(() => ({}));
          for (const video of videoPayload.data?.videos || []) {
            if (video?.projectId && !videoMap[video.projectId]) videoMap[video.projectId] = video;
          }
        }
        setVideosByProject(videoMap);
        const currentId = window.sessionStorage.getItem(CURRENT_PROJECT_KEY);
        let current = data.projects.find((item) => item.id === currentId) || null;
        if (!current && currentId) {
          try {
            current = await getProject(currentId);
          } catch {
            current = null;
          }
          if (!active) return;
        }
        current = current || data.projects[0] || null;
        if (current) window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
        setProjects(data.projects);
        setProjectTotal(Number.isFinite(data.pagination?.total) ? data.pagination.total : data.projects.length);
        setProject(current);
        setStatus('ready');
      } catch (error) {
        if (!active) return;
        setProject(null);
        setStatus('error');
        setNotice(error.message || 'Could not load projects.');
      }
    }

    loadProject();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProject();
    };
    window.addEventListener('focus', loadProject);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('focus', loadProject);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function focusCreate() {
    const section = document.getElementById('create-video');
    section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      document.getElementById('topic-input')?.focus({ preventScroll: true });
    }, 320);
  }

  const draft = project ? draftFromProject(project) : null;
  const storyboard = project ? storyboardFromProject(project) : null;
  const reviewed = project?.review?.approved === true;
  const stage = project ? (reviewed ? 2 : 1) : 0;
  const currentVideo = project ? videosByProject[project.id] || null : null;
  const resumeHref = project
    ? currentVideo || reviewed
      ? `/app/projects/${project.id}/video`
      : project.storyboard?.scenes?.length
        ? `/app/projects/${project.id}`
        : `/app/projects/${project.id}/idea`
    : null;
  const firstName = String(user.displayName || 'Creator').split(' ')[0];
  const statusLabel = status === 'ready' ? 'Studio ready' : status === 'error' ? 'Workspace offline' : 'Connecting';
  const statusDot = status === 'ready' ? 'bg-[#34D399]' : status === 'error' ? 'bg-[#F87171]' : 'bg-[#FBBF24]';

  return (
    <StudioShell
      user={user}
      onNew={focusCreate}
      notice={notice}
      status={status}
      projectCount={projectTotal}
      stage={stage}
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B5CF6]">Creator workspace</p>
          <h1 className="font-landing text-[28px] font-bold leading-[1.05] tracking-[-0.05em] text-[#F5F5F7] sm:text-[34px]">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#9A9AA5]">Pick up a project or start with one idea.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {resumeHref ? (
            <Link
              href={resumeHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#C4B5FD] transition hover:border-[#8B5CF6]/70 hover:bg-[#8B5CF6]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">play_arrow</span>
              Resume project
            </Link>
          ) : null}
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#26262E] bg-[#141419] px-3 py-1.5 text-[12px] font-medium text-[#9A9AA5]">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
      </section>

      <div id="create-video" className="mt-6 scroll-mt-24">
        <CreateVideoHero
          draft={draft}
          onSaved={(saved) => {
            setProject(saved);
            setProjects((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
            setProjectTotal((previous) => previous + 1);
            window.sessionStorage.setItem(CURRENT_PROJECT_KEY, saved.id);
          }}
        />
      </div>
      <DashboardSections
        draft={project === undefined ? undefined : draft}
        storyboard={project === undefined ? undefined : storyboard}
        projects={projects}
        projectTotal={projectTotal}
        videosByProject={videosByProject}
        onNew={focusCreate}
      />
    </StudioShell>
  );
}
