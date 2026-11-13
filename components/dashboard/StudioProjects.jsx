'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProject,
  CURRENT_PROJECT_KEY,
  deleteProject,
  listProjects,
  projectStoryboardSummary,
} from '../../lib/projects-client.js';
import { clearIdeaSuggestions } from '../../lib/idea-suggestions-cache.js';
import { apiRequest } from '../../lib/session-fetch.js';
import ProjectThumb from './ProjectThumb';
import StudioShell from './StudioShell';

const FILTERS = [
  { id: 'all', label: 'All projects', short: 'All' },
  { id: 'draft', label: 'Drafts', short: 'Drafts' },
  { id: 'planning', label: 'In review', short: 'Review' },
  { id: 'approved', label: 'Approved', short: 'Approved' },
  { id: 'rendered', label: 'Video ready', short: 'Video ready' },
];

const STATUS = {
  draft: {
    label: 'Draft',
    badge: 'DRAFT',
    tone: 'draft',
    dot: 'bg-[#FBBF24]',
    meta: 'Brief saved',
    action: 'Edit idea',
  },
  planning: {
    label: 'In review',
    badge: 'REVIEW',
    tone: 'planning',
    dot: 'bg-[#8B5CF6]',
    meta: 'Storyboard needs review',
    action: 'Review storyboard',
  },
  approved: {
    label: 'Approved',
    badge: 'APPROVED',
    tone: 'approved',
    dot: 'bg-[#34D399]',
    meta: 'Approved · ready for video',
    action: 'Review storyboard',
  },
  rendered: {
    label: 'Video ready',
    badge: 'VIDEO',
    tone: 'ready',
    dot: 'bg-[#34D399]',
    meta: 'Video ready',
    action: 'View video',
  },
};

const STAT_STYLES = {
  all: 'bg-[#F5F5F7]',
  draft: 'bg-[#FBBF24]',
  planning: 'bg-[#8B5CF6]',
  approved: 'bg-[#34D399]',
  rendered: 'bg-[#34D399]',
};

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function timeAgo(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Just now';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString();
}

function projectMeta(project) {
  if (project.state === 'rendered' && project.video) {
    const scenes = `${project.sceneCount} ${project.sceneCount === 1 ? 'scene' : 'scenes'}`;
    return `Video ready · ${formatDuration(project.video.seconds)} · ${scenes}`;
  }
  if (project.sceneCount) {
    const scenes = `${project.sceneCount} ${project.sceneCount === 1 ? 'scene' : 'scenes'}`;
    return `${scenes} · ${formatDuration(project.seconds)}`;
  }
  return `${project.format || 'Talking Head / Explainer'} · ${project.targetLabel || '60–90s'}`;
}

function ProjectMenu({ project, onOpen, onVideo, onEditIdea, onDuplicate, onDelete }) {
  const detailsRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (detailsRef.current && !detailsRef.current.contains(event.target)) {
        detailsRef.current.removeAttribute('open');
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') detailsRef.current?.removeAttribute('open');
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function closeMenu(event) {
    event.currentTarget.closest('details')?.removeAttribute('open');
  }

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        aria-label={`Actions for ${project.title}`}
        className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full border border-[#3B3B47] bg-[#0B0B0F]/70 text-[#F5F5F7] backdrop-blur-sm transition hover:border-[#8B5CF6]/50 hover:bg-[#1B1B22] [&::-webkit-details-marker]:hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">more_vert</span>
      </summary>
      <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-[#26262E] bg-[#141419] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onOpen(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#F5F5F7] transition hover:bg-white/[0.05] hover:text-[#C4B5FD]"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
          Open project
        </button>
        {project.state === 'rendered' ? (
          <button
            type="button"
            onClick={(event) => {
              closeMenu(event);
              onVideo(project);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#F5F5F7] transition hover:bg-white/[0.05] hover:text-[#C4B5FD]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">play_circle</span>
            View video
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onEditIdea(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#F5F5F7] transition hover:bg-white/[0.05] hover:text-[#C4B5FD]"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lightbulb</span>
          Edit idea
        </button>
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onDuplicate(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#F5F5F7] transition hover:bg-white/[0.05] hover:text-[#C4B5FD]"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
          Duplicate
        </button>
        <div className="my-1 border-t border-[#26262E]" />
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onDelete(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#FCA5A5] transition hover:bg-[#F87171]/10 hover:text-[#FEE2E2]"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
          Delete project
        </button>
      </div>
    </details>
  );
}

function ProjectCard({ project, view, onOpen, onVideo, onEditIdea, onDuplicate, onDelete }) {
  const state = STATUS[project.state] || STATUS.draft;
  const meta = project.state === 'rendered' && project.video
    ? `Video ready · ${timeAgo(project.video.createdAt)}`
    : state.meta;
  const thumbDuration = project.state === 'rendered' && project.video
    ? formatDuration(project.video.seconds)
    : project.seconds ? formatDuration(project.seconds) : '—:—';
  const thumbLabel = project.state === 'rendered' ? 'VIDEO' : project.sceneCount ? 'STORYBOARD' : 'BRIEF';
  const title = (
    <button
      type="button"
      onClick={() => onOpen(project)}
      className="block max-w-full truncate text-left font-landing text-[16px] font-semibold leading-6 tracking-[-0.02em] text-[#F5F5F7] transition hover:text-[#C4B5FD]"
    >
      {project.title}
    </button>
  );

  if (view === 'list') {
    return (
      <article className="flex flex-col gap-3 rounded-2xl border border-[#26262E] bg-[#141419] p-3 transition hover:border-[#8B5CF6]/35 hover:bg-[#17171E] sm:flex-row sm:items-center">
        <button type="button" onClick={() => onOpen(project)} aria-label={`Open ${project.title}`} className="relative w-full text-left sm:w-[200px] sm:shrink-0">
          <ProjectThumb
            formatId={project.formatId}
            badge={state.badge}
            tone={state.tone}
            duration={thumbDuration}
            label={thumbLabel}
          />
        </button>
        <div className="min-w-0 flex-1 px-1 sm:px-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0">{title}</div>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${state.dot}`} title={state.label} />
          </div>
          <p className="mt-1 truncate text-[13px] text-[#9A9AA5]">{projectMeta(project)}</p>
          <p className="mt-1 text-[13px] text-[#5F5F6B]">{meta} · Updated {timeAgo(project.updatedAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 px-1 sm:px-0">
          <button
            type="button"
            onClick={() => (project.state === 'rendered' ? onVideo(project) : onOpen(project))}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#26262E] bg-[#1B1B22] px-3.5 py-2 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40 hover:bg-[#24242E]"
          >
            {state.action}
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
          </button>
          <ProjectMenu project={project} onOpen={onOpen} onVideo={onVideo} onEditIdea={onEditIdea} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419] transition hover:border-[#8B5CF6]/40 hover:bg-[#17171E]">
      <div className="relative p-2.5">
        <button type="button" onClick={() => onOpen(project)} aria-label={`Open ${project.title}`} className="block w-full text-left">
          <ProjectThumb
            formatId={project.formatId}
            badge={state.badge}
            tone={state.tone}
            duration={thumbDuration}
            label={thumbLabel}
          />
        </button>
        <div className="absolute right-4 top-4">
          <ProjectMenu project={project} onOpen={onOpen} onVideo={onVideo} onEditIdea={onEditIdea} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">{title}</div>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${state.dot}`} title={state.label} />
        </div>
        <p className="mt-1 truncate text-[13px] text-[#9A9AA5]">{projectMeta(project)}</p>
        <p className="mt-1 text-[13px] text-[#5F5F6B]">{meta}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#26262E] pt-3">
          <span className="font-mono text-[11px] text-[#5F5F6B]">Updated {timeAgo(project.updatedAt)}</span>
          <button
            type="button"
            onClick={() => (project.state === 'rendered' ? onVideo(project) : onOpen(project))}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#C4B5FD] transition hover:text-white"
          >
            {state.action}
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#26262E] bg-[#141419] p-2.5">
      <div className="aspect-[16/10] animate-pulse rounded-[16px] bg-[#1B1B22]" />
      <div className="space-y-2 px-1.5 py-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#26262E]" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#1F1F27]" />
      </div>
    </div>
  );
}

function EmptyProjects({ filter, query, hasAny, onClear, onNew }) {
  const filterItem = FILTERS.find((item) => item.id === filter);
  const filterLabel = filterItem?.short || 'projects';
  const emptyLabel = filter === 'all'
    ? 'projects'
    : filter === 'draft'
      ? 'drafts'
      : filter === 'planning'
        ? 'projects in review'
        : filter === 'approved'
          ? 'approved projects'
          : filter === 'rendered'
            ? 'videos ready'
            : `${filterLabel.toLowerCase()} projects`;
  const title = query
    ? `No projects match “${query}”`
    : hasAny
      ? `No ${emptyLabel} yet`
      : 'Your first project starts here';
  const body = query
    ? 'Try a different title or topic, or clear the search to see every project.'
    : !hasAny
      ? 'Create a brief in the studio. It appears here with an honest Draft state before any generation happens.'
      : filter === 'planning'
        ? 'Request a storyboard from a draft review, then it will appear here for scene review.'
        : filter === 'approved'
          ? 'Approve an exact storyboard revision in a draft review, then it will appear here.'
          : filter === 'rendered'
            ? 'Render an approved storyboard in the Video step. It will appear here with a Video ready state.'
            : 'Start a new project or clear the filter to see your other projects.';
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#3B3B47] bg-[#0B0B0F] px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#26262E] bg-[#141419] text-[#8B5CF6]">
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{query ? 'search_off' : 'video_library'}</span>
      </span>
      <h2 className="mt-3 font-landing text-[18px] font-semibold text-[#F5F5F7]">{title}</h2>
      <p className="mt-1.5 max-w-md text-[14px] leading-6 text-[#9A9AA5]">{body}</p>
      {query || filter !== 'all' ? (
        <button type="button" onClick={onClear} className="mt-4 rounded-full border border-[#3B3B47] bg-[#141419] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40 hover:bg-[#1B1B22]">
          Clear filters
        </button>
      ) : (
        <button type="button" onClick={onNew} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]">
          Start a project
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
        </button>
      )}
    </div>
  );
}

export default function StudioProjects({ user }) {
  const router = useRouter();
  const [projects, setProjects] = useState(undefined);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState('');

  async function loadProjects() {
    try {
      const [data, videoResponse] = await Promise.all([
        listProjects({ limit: 50 }),
        apiRequest('/api/v1/videos').catch(() => null),
      ]);
      const videoMap = new Map();
      if (videoResponse?.ok) {
        const videoPayload = await videoResponse.json().catch(() => ({}));
        for (const video of videoPayload.data?.videos || []) {
          if (video?.projectId && !videoMap.has(video.projectId)) videoMap.set(video.projectId, video);
        }
      }
      const nextProjects = data.projects.map((project) => {
        const summary = projectStoryboardSummary(project);
        const video = videoMap.get(project.id) || null;
        return {
          ...project,
          ...summary,
          video,
          state: project.review?.approved && video ? 'rendered' : summary.state,
          reviewed: project.review?.approved === true,
        };
      });
      setProjects(nextProjects);
      setTotal(Number.isFinite(data.pagination?.total) ? data.pagination.total : nextProjects.length);
      setError('');
    } catch (requestError) {
      setProjects([]);
      setTotal(0);
      setError(requestError.message || 'Could not load projects. Refresh and try again.');
    }
  }

  useEffect(() => {
    loadProjects();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProjects();
    };
    window.addEventListener('focus', loadProjects);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', loadProjects);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setVisibleCount(6);
  }, [query, filter, sort]);

  useEffect(() => {
    if (!deleteTarget) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setDeleteTarget(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteTarget]);

  const counts = useMemo(() => {
    const source = projects || [];
    return {
      all: Math.max(total, source.length),
      draft: source.filter((project) => project.state === 'draft').length,
      planning: source.filter((project) => project.state === 'planning').length,
      approved: source.filter((project) => project.state === 'approved').length,
      rendered: source.filter((project) => project.state === 'rendered').length,
    };
  }, [projects, total]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (projects || [])
      .filter((project) => filter === 'all' || project.state === filter)
      .filter((project) => !needle || `${project.title} ${project.topic}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title);
        const first = Date.parse(a.updatedAt) || 0;
        const second = Date.parse(b.updatedAt) || 0;
        return sort === 'oldest' ? first - second : second - first;
      });
  }, [projects, filter, query, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasAny = counts.all > 0;
  const loading = projects === undefined;
  const status = loading ? 'loading' : error ? 'error' : 'ready';

  function newProject() {
    router.push('/app#create-video');
  }

  function openProject(project) {
    window.sessionStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    router.push(project.sceneCount ? `/app/projects/${project.id}` : `/app/projects/${project.id}/idea`);
  }

  function viewVideo(project) {
    window.sessionStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    router.push(`/app/projects/${project.id}/video`);
  }

  function editIdea(project) {
    window.sessionStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    router.push(`/app/projects/${project.id}/idea`);
  }

  async function duplicate(project) {
    try {
      const copy = await createProject({
        title: `${project.title} (copy)`.slice(0, 120),
        topic: project.topic,
        audience: project.audience || '',
        notes: project.notes || '',
        voicePreset: project.voicePreset || 'daniel-test',
        format: project.format,
        formatId: project.formatId,
        targetSeconds: project.targetSeconds,
        targetLabel: project.targetLabel,
        aspect: project.aspect,
        storyboard: project.storyboard || null,
      });
      await loadProjects();
      setNotice(`Duplicated “${project.title}” into a new project.`);
    } catch (requestError) {
      setNotice(requestError.message || 'The project could not be duplicated.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      clearIdeaSuggestions(deleteTarget.id);
      if (window.sessionStorage.getItem(CURRENT_PROJECT_KEY) === deleteTarget.id) {
        window.sessionStorage.removeItem(CURRENT_PROJECT_KEY);
      }
      setDeleteTarget(null);
      await loadProjects();
      setNotice('Project deleted.');
    } catch (requestError) {
      setNotice(requestError.message || 'The project could not be deleted.');
    }
  }

  function clearFilters() {
    setQuery('');
    setFilter('all');
    setSort('updated');
  }

  const stats = [
    ['Total', 'all', counts.all],
    ['Drafts', 'draft', counts.draft],
    ['In review', 'planning', counts.planning],
    ['Approved', 'approved', counts.approved],
    ['Video ready', 'rendered', counts.rendered],
  ];

  return (
    <StudioShell
      user={user}
      onNew={newProject}
      onNotice={setNotice}
      notice={notice}
      status={status}
      projectCount={counts.all}
      stage={0}
      purpleAmbient
    >
      <section aria-labelledby="projects-heading" className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">01 / Library</p>
          <h1 id="projects-heading" className="mt-2 font-landing text-[30px] font-bold leading-tight tracking-[-0.04em] text-[#F5F5F7] sm:text-[34px]">
            Projects
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#9A9AA5]">
            Every brief, storyboard and render in one place. Drafts stay editable; generation starts only after approval.
          </p>
        </div>
        <button
          type="button"
          onClick={newProject}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 self-stretch rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] active:scale-[0.99] sm:self-start lg:self-auto"
        >
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
          New project
        </button>
      </section>

      <section aria-label="Project summary" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([label, key, value]) => (
          <div key={key} className="rounded-2xl border border-[#26262E] bg-[#141419] p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#9A9AA5]">
              <span className={`h-1.5 w-1.5 rounded-full ${STAT_STYLES[key]}`} aria-hidden="true" />
              {label}
            </div>
            <p className="mt-2 font-landing text-[24px] font-semibold leading-none text-[#F5F5F7]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[#26262E] bg-[#141419] p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative min-w-0 flex-1 sm:w-[300px] sm:flex-none lg:w-[360px]">
              <span className="sr-only">Search projects</span>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#5F5F6B]" aria-hidden="true">search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects by title or topic…"
                className="h-[42px] w-full rounded-xl border border-[#26262E] bg-[#0B0B0F] pl-10 pr-9 text-[14px] text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6]/60 focus:ring-2 focus:ring-[#8B5CF6]/15"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[#5F5F6B] transition hover:bg-white/[0.05] hover:text-[#F5F5F7]">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
                </button>
              ) : null}
            </label>

            <div className="flex items-center gap-2">
              <label className="relative inline-flex h-[42px] min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-[#26262E] bg-[#0B0B0F] pl-3 pr-8 text-[13px] text-[#9A9AA5] sm:flex-none">
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">sort</span>
                <span className="sr-only">Sort projects</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="max-w-[130px] appearance-none border-0 bg-transparent p-0 text-[13px] font-medium text-[#F5F5F7] outline-none">
                  <option value="updated">Latest updated</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A–Z</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 text-[15px] text-[#5F5F6B]" aria-hidden="true">expand_more</span>
              </label>

              <div className="flex h-[42px] shrink-0 rounded-xl border border-[#26262E] bg-[#0B0B0F] p-0.5" role="group" aria-label="Project layout">
                <button
                  type="button"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                  className={`grid h-full w-8 place-items-center rounded-lg transition ${view === 'grid' ? 'bg-[#1B1B22] text-[#F5F5F7]' : 'text-[#5F5F6B] hover:text-[#F5F5F7]'}`}
                  title="Grid view"
                >
                  <span className="material-symbols-outlined text-[17px]" aria-hidden="true">grid_view</span>
                </button>
                <button
                  type="button"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                  className={`grid h-full w-8 place-items-center rounded-lg transition ${view === 'list' ? 'bg-[#1B1B22] text-[#F5F5F7]' : 'text-[#5F5F6B] hover:text-[#F5F5F7]'}`}
                  title="List view"
                >
                  <span className="material-symbols-outlined text-[17px]" aria-hidden="true">view_list</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Project filters">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                    active
                      ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                      : 'border-[#26262E] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#3B3B47] hover:text-[#F5F5F7]'
                  }`}
                >
                  {item.short}
                  <span className={`font-mono text-[11px] tabular-nums ${active ? 'text-white/70' : 'text-[#5F5F6B]'}`}>{counts[item.id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#26262E] bg-[#0B0B0F] px-3 py-2.5 text-[13px] leading-5 text-[#777781]">
          <span className="material-symbols-outlined mt-0.5 text-[16px] text-[#8B5CF6]" aria-hidden="true">lock</span>
          <p>
            <span className="font-semibold text-[#C4B5FD]">Your projects.</span> Private to your account. Storyboard generation uses AI; footage, playback and downloads are not connected yet.
          </p>
        </div>

        <div className="mt-4">
          {error ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-5 text-[#FCA5A5]">{error}</p>
              <button type="button" onClick={loadProjects} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#F87171]/40 bg-[#141419] px-3 py-1.5 text-[13px] font-semibold text-[#FCA5A5] transition hover:bg-[#F87171]/10">
                Try again
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
              </button>
            </div>
          ) : loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
            </div>
          ) : visible.length ? (
            <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'}>
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  view={view}
                  onOpen={openProject}
                  onVideo={viewVideo}
                  onEditIdea={editIdea}
                  onDuplicate={duplicate}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid' : 'block'}>
              <EmptyProjects filter={filter} query={query} hasAny={hasAny} onClear={clearFilters} onNew={newProject} />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-[#26262E] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#5F5F6B]">
            Showing <span className="font-mono tabular-nums text-[#9A9AA5]">{visible.length}</span> of <span className="font-mono tabular-nums text-[#9A9AA5]">{filtered.length}</span> projects
            {filter !== 'all' || query ? ' in this view' : ''}
          </p>
          {visible.length < filtered.length ? (
            <button type="button" onClick={() => setVisibleCount((count) => count + 6)} className="inline-flex items-center gap-1 rounded-full border border-[#26262E] bg-[#0B0B0F] px-3 py-1.5 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40 hover:bg-[#1B1B22]">
              Load more projects
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">expand_more</span>
            </button>
          ) : null}
        </div>
      </section>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
          aria-describedby="delete-project-description"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#26262E] bg-[#141419] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F87171]/10 text-[#F87171]">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">delete</span>
            </span>
            <h2 id="delete-project-title" className="mt-3 font-landing text-[20px] font-semibold tracking-[-0.03em] text-[#F5F5F7]">Delete this project?</h2>
            <p id="delete-project-description" className="mt-2 text-[14px] leading-6 text-[#9A9AA5]">
              “{deleteTarget.title}” will be permanently deleted, including its current storyboard. This cannot be undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-[#26262E] bg-[#0B0B0F] px-4 py-2.5 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#3B3B47] hover:bg-[#1B1B22]" autoFocus>
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-[#F87171] px-4 py-2.5 text-[13px] font-semibold text-[#1A0505] transition hover:bg-[#FCA5A5]">
                Delete project
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioShell>
  );
}
