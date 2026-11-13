'use client';

import Link from 'next/link';
import { projectStoryboardSummary } from '../../lib/projects-client.js';
import ProjectThumb from './ProjectThumb';

const STEP_RAIL = ['Idea', 'Storyboard', 'Video', 'Publish'];

const STATUS_TONES = {
  draft: 'border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5]',
  planning: 'border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD]',
  approved: 'border-[#34D399]/40 bg-[#34D399]/10 text-[#6EE7B7]',
  rendered: 'border-[#34D399]/40 bg-[#34D399]/10 text-[#6EE7B7]',
};

function videoDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function relativeTime(value) {
  const ts = Date.parse(value || '');
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function durationLabel(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return mins ? `${mins}:${String(rest).padStart(2, '0')} min` : `${rest}s`;
}

function projectHref(project) {
  const scenes = project?.storyboard?.scenes?.length || 0;
  return scenes ? `/app/projects/${project.id}` : `/app/projects/${project.id}/idea`;
}

function StepRail({ projectId, hasWork, hasStoryboard, reviewed, hasVideo }) {
  const hrefs = [
    projectId && hasWork ? `/app/projects/${projectId}/idea` : null,
    projectId && hasStoryboard ? `/app/projects/${projectId}` : null,
    projectId && reviewed ? `/app/projects/${projectId}/video` : null,
    null,
  ];
  const titles = ['Open the idea brief', 'Review the storyboard', 'Open the Video step', 'Publishing comes later'];

  return (
    <ol className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Project progress">
      {STEP_RAIL.map((label, index) => {
        const done = index === 0 ? hasWork : index === 1 ? reviewed : index === 2 ? hasVideo : false;
        const current = index === 0 ? false : index === 1 ? hasStoryboard && !reviewed : index === 2 ? reviewed && !hasVideo : false;
        const gated = index === 3;
        const href = hrefs[index];
        const className = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
          done
            ? 'border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]'
            : current
              ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-[#C4B5FD]'
              : href
                ? 'border-[#26262E] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#3B3B47] hover:text-[#F5F5F7]'
                : 'border-[#26262E] bg-[#0B0B0F] text-[#5F5F6B]'
        }`;
        const content = (
          <>
            <span
              className={`h-1 w-1 rounded-full ${done ? 'bg-[#34D399]' : current ? 'bg-[#8B5CF6]' : 'bg-[#3A3A45]'}`}
              aria-hidden="true"
            />
            {label}
            {gated ? <span className="sr-only"> (publishing comes later)</span> : null}
          </>
        );

        return (
          <li key={label} className="flex items-center gap-1.5">
            {href ? (
              <Link href={href} className={className} title={titles[index]}>
                {content}
              </Link>
            ) : (
              <span className={className} title={titles[index]} aria-disabled={!href}>
                {content}
              </span>
            )}
            {index < STEP_RAIL.length - 1 ? (
              <span className="text-[13px] text-[#3F3F4A]" aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CurrentProject({ draft, storyboard, video, loading, onNew }) {
  const hasDraft = Boolean(draft);
  const hasStoryboard = Boolean(storyboard?.storyboard?.scenes?.length);
  const reviewed = hasStoryboard && storyboard?.review?.approved === true;
  const hasVideo = Boolean(video);
  const hasWork = hasDraft || hasStoryboard;
  const sceneCount = Number(storyboard?.sceneCount || storyboard?.storyboard?.scenes?.length || 0);
  const seconds = Number(storyboard?.seconds || 0);
  const title = draft?.title || storyboard?.storyboard?.title || 'Untitled project';
  const format = draft?.format || 'Storyboard draft';
  const updated = relativeTime(draft?.updatedAt);
  const href = draft?.id ? projectHref({ id: draft.id, storyboard: storyboard?.storyboard }) : null;
  const primaryHref = draft?.id && (hasVideo || reviewed) ? `/app/projects/${draft.id}/video` : href;
  const primaryLabel = hasVideo ? 'View video' : reviewed ? 'Open video step' : hasStoryboard ? 'Review storyboard' : 'Edit idea';
  const state = hasVideo ? 'rendered' : reviewed ? 'approved' : hasStoryboard ? 'planning' : 'draft';
  const stateLabel = hasVideo ? 'Video ready' : reviewed ? 'Approved' : hasStoryboard ? 'Storyboard' : 'Brief';

  return (
    <section id="active-job" className="mt-8 scroll-mt-24" aria-labelledby="current-project-heading">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[11px] font-semibold text-[#8B5CF6]">01</span>
        <h2 id="current-project-heading" className="text-[16px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
          Current project
        </h2>
        <span className="ml-auto text-[12px] text-[#5F5F6B]">
          {loading ? 'Loading' : hasWork ? '1 in progress' : 'None in progress'}
        </span>
      </div>

      {loading ? (
        <div className="mt-3 h-40 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419]" />
      ) : hasWork ? (
        <article className="studio-surface mt-3 overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419] shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:border-[#8B5CF6]/30 hover:bg-[#15151B]">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#2B2B35] bg-[#0B0B0F] px-2.5 py-1 text-[12px] font-medium text-[#9A9AA5]">
                  {format}
                </span>
                {updated ? <span className="text-[12px] text-[#5F5F6B]">Updated {updated}</span> : null}
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_TONES[state]}`}>
                  {stateLabel}
                </span>
              </div>

              {href ? (
                <Link
                  href={href}
                  className="group/title mt-3 inline-flex max-w-full items-center gap-2 font-landing text-[22px] font-bold leading-tight tracking-[-0.035em] text-[#F5F5F7] transition hover:text-white sm:text-[26px]"
                >
                  <span className="truncate">{title}</span>
                  <span className="material-symbols-outlined shrink-0 text-[18px] text-[#8B5CF6] opacity-0 transition group-hover/title:opacity-100" aria-hidden="true">
                    arrow_outward
                  </span>
                </Link>
              ) : (
                <h3 className="mt-3 font-landing text-[22px] font-bold tracking-[-0.035em] text-[#F5F5F7] sm:text-[26px]">{title}</h3>
              )}
              <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-[#9A9AA5]">
                {hasStoryboard
                  ? `${sceneCount} storyboard ${sceneCount === 1 ? 'scene' : 'scenes'}${seconds ? ` · ${durationLabel(seconds)}` : ''} · ${
                      hasVideo
                        ? `Video ready · ${videoDuration(video.seconds)}`
                        : reviewed
                          ? 'Approved and ready to render.'
                          : 'Ready for scene-by-scene review.'
                    }`
                  : 'Brief saved. Choose an idea direction and build the storyboard next.'}
              </p>

              <StepRail projectId={draft?.id} hasWork={hasWork} hasStoryboard={hasStoryboard} reviewed={reviewed} hasVideo={hasVideo} />
            </div>

            <div className="flex shrink-0 items-center gap-4">
              {href ? (
                <Link href={href} aria-label={`Open ${title}`} className="shrink-0 transition hover:opacity-90">
                  <ProjectThumb
                    formatId={draft?.formatId || 'talking-head'}
                    badge={hasVideo ? 'VIDEO' : reviewed ? 'APPROVED' : hasStoryboard ? 'STORYBOARD' : 'BRIEF'}
                    tone={hasVideo ? 'ready' : reviewed ? 'approved' : hasStoryboard ? 'planning' : 'draft'}
                    compact
                    duration={hasVideo ? videoDuration(video.seconds) : seconds ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}` : '—:—'}
                    className="w-32"
                  />
                </Link>
              ) : (
                <ProjectThumb
                  formatId={draft?.formatId || 'talking-head'}
                  badge={hasVideo ? 'VIDEO' : reviewed ? 'APPROVED' : hasStoryboard ? 'STORYBOARD' : 'BRIEF'}
                  tone={hasVideo ? 'ready' : reviewed ? 'approved' : hasStoryboard ? 'planning' : 'draft'}
                  compact
                  duration={hasVideo ? videoDuration(video.seconds) : seconds ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}` : '—:—'}
                  className="w-32"
                />
              )}
              <div className="flex min-w-0 flex-col items-start gap-2">
                {primaryHref ? (
                  <Link
                    href={primaryHref}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-[14px] font-semibold text-white transition hover:bg-[#7C3AED] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
                  >
                    {primaryLabel}
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                ) : null}
                {draft?.id && hasStoryboard ? (
                  <Link
                    href={`/app/projects/${draft.id}/idea`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#9A9AA5] transition hover:text-[#F5F5F7]"
                  >
                    Edit brief
                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">edit</span>
                  </Link>
                ) : null}
                <p className="max-w-[160px] text-[13px] leading-5 text-[#5F5F6B]">
                  {hasStoryboard ? 'Auto-saved.' : 'Add audience, notes and voice.'}
                </p>
              </div>
            </div>
          </div>
        </article>
      ) : (
        <article className="mt-3 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">movie</span>
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F5F5F7]">No project in progress</p>
              <p className="mt-1 max-w-md text-[13px] leading-5 text-[#9A9AA5]">
                Start with a topic above. The brief is saved before any storyboard work begins.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[14px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50 hover:text-white"
          >
            Start a project
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
          </button>
        </article>
      )}
    </section>
  );
}

function RecentProjectCard({ project, video }) {
  const summary = projectStoryboardSummary(project);
  const hasVideo = Boolean(video);
  const reviewed = summary.state === 'approved' || hasVideo;
  const hasScenes = summary.sceneCount > 0;
  const tone = hasVideo ? 'rendered' : reviewed ? 'approved' : hasScenes ? 'planning' : 'draft';
  const label = hasVideo ? 'Video ready' : reviewed ? 'Approved' : hasScenes ? 'Storyboard' : 'Brief';
  const href = hasVideo ? `/app/projects/${project.id}/video` : projectHref(project);

  return (
    <Link
      href={href}
      aria-label={`Open ${project.title || 'project'}`}
      className="studio-surface group flex flex-col rounded-2xl border border-[#26262E] bg-[#141419] p-4 transition hover:-translate-y-0.5 hover:border-[#8B5CF6]/45 hover:bg-[#17171E] hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate rounded-full border border-[#2B2B35] bg-[#0B0B0F] px-2.5 py-1 text-[12px] font-medium text-[#9A9AA5]">
          {project.format || 'Project'}
        </span>
        <span className="shrink-0 font-mono text-[11px] tracking-[0.02em] text-[#5F5F6B]">{relativeTime(project.updatedAt)}</span>
      </div>

      <p className="mt-3 line-clamp-2 font-landing text-[16px] font-semibold leading-6 tracking-[-0.02em] text-[#F5F5F7]">{project.title}</p>
      <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-[#9A9AA5]">{project.topic || 'No topic saved yet.'}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#5F5F6B]">
          {hasVideo
            ? `Video ready · ${videoDuration(video.seconds)}`
            : hasScenes
              ? `${summary.sceneCount} ${summary.sceneCount === 1 ? 'scene' : 'scenes'}${summary.seconds ? ` · ${durationLabel(summary.seconds)}` : ''}`
              : `${project.targetLabel || '60–90s'} · ${project.aspect || '9:16'}`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_TONES[tone]}`}>
            {label}
          </span>
          <span className="material-symbols-outlined text-[15px] text-[#8B5CF6] opacity-0 transition group-hover:opacity-100" aria-hidden="true">
            arrow_outward
          </span>
        </div>
      </div>
    </Link>
  );
}

function RecentProjects({ projects, projectTotal, currentId, loading, onNew, videosByProject = {} }) {
  const others = (projects || []).filter((project) => project.id !== currentId).slice(0, 3);
  const loadedCount = (projects || []).length;
  const count = Number.isFinite(projectTotal) ? Math.max(projectTotal, loadedCount) : loadedCount;

  return (
    <section id="recent-projects" className="mt-8 scroll-mt-24" aria-labelledby="recent-projects-heading">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[11px] font-semibold text-[#8B5CF6]">02</span>
        <h2 id="recent-projects-heading" className="text-[16px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
          Recent projects
        </h2>
        {count ? <span className="text-[12px] text-[#5F5F6B]">({count})</span> : null}
        <Link href="/app/projects" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#C4B5FD] transition hover:text-white">
          View all
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full h-40 animate-pulse rounded-2xl bg-[#141419]" />
        ) : (
          <>
            {others.map((project) => (
              <RecentProjectCard key={project.id} project={project} video={videosByProject[project.id] || null} />
            ))}
            {others.length < 3 ? (
              <button
                type="button"
                onClick={onNew}
                className="group flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] p-5 text-center transition hover:border-[#8B5CF6]/45 hover:bg-[#141419] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[#2B2B35] bg-[#141419] text-[#9A9AA5] transition group-hover:text-[#C4B5FD]">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
                </span>
                <span className="mt-3 text-[14px] font-semibold text-[#F5F5F7]">Start another project</span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">Topic → storyboard → free video</span>
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default function DashboardSections({ draft, storyboard, projects, projectTotal, videosByProject = {}, onNew }) {
  const loading = draft === undefined || storyboard === undefined;
  const currentId = draft?.id || null;

  return (
    <>
      <CurrentProject
        draft={loading ? undefined : draft}
        storyboard={loading ? undefined : storyboard}
        video={videosByProject[draft?.id] || null}
        loading={loading}
        onNew={onNew}
      />
      <RecentProjects projects={projects} projectTotal={projectTotal} currentId={currentId} loading={loading} onNew={onNew} videosByProject={videosByProject} />
      <section id="drafts" className="studio-surface mt-8 scroll-mt-24 rounded-2xl border border-[#26262E] bg-[#0F0F14] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold text-[#8B5CF6]">03</span>
            <p className="text-[15px] font-semibold text-[#F5F5F7]">Studio methodology</p>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-6 text-[#9A9AA5]">
            <span><span className="font-semibold text-[#C4B5FD]">1.</span> Rough idea notes</span>
            <span className="text-[#3F3F4A]" aria-hidden="true">→</span>
            <span><span className="font-semibold text-[#C4B5FD]">2.</span> Visual storyboard review</span>
            <span className="text-[#3F3F4A]" aria-hidden="true">→</span>
            <span><span className="font-semibold text-[#C4B5FD]">3.</span> Free graphics video</span>
            <span className="text-[#3F3F4A]" aria-hidden="true">→</span>
            <span><span className="font-semibold text-[#C4B5FD]">4.</span> MP4 download</span>
          </p>
        </div>
        <p className="mt-2 text-[14px] leading-5 text-[#5F5F6B]">
          Review before render. Hinglish screen text, Hindi voice, free graphics video and MP4 download are connected. Publishing comes later.
        </p>
      </section>
    </>
  );
}
