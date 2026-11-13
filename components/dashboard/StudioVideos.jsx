'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/session-fetch.js';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function timeAgo(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recently';
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

function VideoModal({ video, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div className="relative w-full max-w-[360px]" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -right-2 -top-11 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#141419] text-[#F5F5F7] transition hover:border-white/30 hover:bg-[#1B1B22]"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
        <video
          controls
          autoPlay
          playsInline
          src={video.outputUrl}
          className="max-h-[70vh] w-full rounded-2xl border border-[#2B2B35] bg-black object-contain"
        />
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#26262E] bg-[#141419] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#F5F5F7]">{video.title}</p>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#777781]">
              {formatDuration(video.seconds)} · {video.voice === 'female' ? 'Female' : 'Male'} voice
            </p>
          </div>
          <a
            href={video.downloadUrl || video.outputUrl}
            download
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl border border-[#2B2B35] bg-[#1B1B22] px-3 py-2 text-[12px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StudioVideos({ user }) {
  const router = useRouter();
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);
  const [backupState, setBackupState] = useState('idle');
  const [backupMessage, setBackupMessage] = useState('');
  const [cloudState, setCloudState] = useState('idle');
  const [cloudMessage, setCloudMessage] = useState('');
  const [storage, setStorage] = useState({ available: true, durableCount: 0, localCount: 0 });

  useEffect(() => {
    let alive = true;
    setVideos(null);
    setError('');
    (async () => {
      try {
        const response = await apiRequest('/api/v1/videos');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Could not load videos.');
        if (alive) {
          setVideos(Array.isArray(payload.data?.videos) ? payload.data.videos : []);
          setStorage({
            available: payload.data?.storageAvailable !== false,
            durableCount: Number(payload.data?.durableCount) || 0,
            localCount: Number(payload.data?.localCount) || 0,
          });
        }
      } catch (loadError) {
        if (!alive) return;
        setError(loadError.message || 'Could not load videos.');
        setVideos([]);
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const count = videos?.length ?? 0;

  async function backupAll() {
    if (backupState === 'working' || count === 0) return;
    setBackupState('working');
    setBackupMessage('');
    try {
      const response = await apiRequest('/api/v1/videos/backup', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not create the backup.');
      setBackupState('done');
      setBackupMessage(`Backup saved to ${payload.data.directory} · ${payload.data.count} videos`);
    } catch (backupError) {
      setBackupState('error');
      setBackupMessage(backupError.message || 'Could not create the backup.');
    }
  }

  async function saveToCloud() {
    if (cloudState === 'working' || count === 0 || storage.available === false) return;
    setCloudState('working');
    setCloudMessage('');
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let remaining = 1;
    let iterations = 0;
    try {
      while (remaining > 0 && iterations < 30) {
        iterations += 1;
        const response = await apiRequest('/api/v1/videos/backfill', { method: 'POST' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Could not save videos to the cloud.');
        const data = payload.data || {};
        totalSaved += Number(data.saved) || 0;
        totalSkipped += Number(data.skipped) || 0;
        totalFailed += Number(data.failed) || 0;
        remaining = Number(data.remaining) || 0;
        setCloudMessage(
          `Saving… ${totalSaved} saved${totalSkipped ? ` · ${totalSkipped} already saved` : ''}${totalFailed ? ` · ${totalFailed} failed` : ''}`,
        );
      }
      if (remaining > 0) {
        setCloudState('error');
        setCloudMessage('Some videos are still pending. Try again.');
      } else {
        setCloudState(totalFailed ? 'error' : 'done');
        setCloudMessage(
          `${totalSaved} saved${totalSkipped ? ` · ${totalSkipped} already saved` : ''}${totalFailed ? ` · ${totalFailed} could not be saved` : ''}`,
        );
      }
      setReloadKey((value) => value + 1);
    } catch (cloudError) {
      setCloudState('error');
      setCloudMessage(cloudError.message || 'Could not save videos to the cloud.');
    }
  }

  return (
    <StudioShell
      user={user}
      onNew={() => router.push('/app#create-video')}
      notice=""
      stage={2}
      sectionLabel="Videos"
      purpleAmbient
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9A9AA5]">Your studio</p>
          <h1 className="mt-1 font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] sm:text-[36px]">Videos</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Finished renders from your projects. Only videos you generate appear here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#26262E] bg-[#141419] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-[#9A9AA5]">
            {videos === null ? 'Loading' : `${count} ${count === 1 ? 'video' : 'videos'}`}
          </span>
          {videos !== null && count > 0 ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
              storage.localCount
                ? 'border-[#FBBF24]/35 bg-[#FBBF24]/10 text-[#FCD34D]'
                : 'border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${storage.localCount ? 'bg-[#FBBF24]' : 'bg-[#34D399]'}`} aria-hidden="true" />
              {storage.localCount ? `${storage.localCount} local only` : 'All saved'}
            </span>
          ) : null}
          <button
            type="button"
            onClick={saveToCloud}
            disabled={cloudState === 'working' || count === 0 || storage.available === false}
            title={storage.available === false ? 'Cloud saving is not set up yet.' : 'Save local videos so they survive redeploys.'}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#8B5CF6]/45 bg-[#8B5CF6]/10 px-3.5 py-2 text-[13px] font-semibold text-[#C4B5FD] transition hover:border-[#8B5CF6]/70 hover:bg-[#8B5CF6]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cloud_upload</span>
            {cloudState === 'working' ? 'Saving…' : 'Save to cloud'}
          </button>
          <button
            type="button"
            onClick={backupAll}
            disabled={backupState === 'working' || count === 0}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">archive</span>
            {backupState === 'working' ? 'Backing up…' : 'Backup all'}
          </button>
          <Link
            href="/app/projects"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">video_library</span>
            Projects
          </Link>
        </div>
      </section>

      {storage.available === false ? (
        <p className="mt-3 rounded-lg border border-[#FBBF24]/35 bg-[#FBBF24]/10 px-3 py-2 text-[12px] leading-5 text-[#FCD34D]">
          Cloud saving is not available yet. Videos stay local until it is set up.
        </p>
      ) : null}

      {backupMessage ? (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-[12px] leading-5 ${
            backupState === 'error'
              ? 'border-[#F87171]/35 bg-[#F87171]/10 text-[#FCA5A5]'
              : 'border-[#34D399]/30 bg-[#34D399]/10 text-[#6EE7B7]'
          }`}
        >
          {backupMessage}
        </p>
      ) : null}

      {cloudMessage ? (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-[12px] leading-5 ${
            cloudState === 'error'
              ? 'border-[#F87171]/35 bg-[#F87171]/10 text-[#FCA5A5]'
              : 'border-[#34D399]/30 bg-[#34D399]/10 text-[#6EE7B7]'
          }`}
        >
          {cloudMessage}
        </p>
      ) : null}

      {videos === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419]">
              <div className="aspect-[9/16] animate-pulse bg-[#1B1B22]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-4/5 animate-pulse rounded bg-[#26262E]" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-[#26262E]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <section className="mt-6 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/5 px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 text-[#FCA5A5]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">cloud_off</span>
          </span>
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Videos could not load</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Try again
          </button>
        </section>
      ) : videos.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">movie</span>
          </span>
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">No videos yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">
            Render an approved storyboard in the Video step. Your finished videos will appear here.
          </p>
          <Link
            href="/app/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Go to projects
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videos.map((video) => (
            <article key={video.runId} className="group overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419] transition hover:border-[#8B5CF6]/40">
              <button
                type="button"
                onClick={() => setActiveVideo(video)}
                aria-label={`Play ${video.title}`}
                className="relative block w-full overflow-hidden bg-[#0B0B0F] text-left"
              >
                <div className="aspect-[9/16] w-full">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#1B1B2A,#0B0B0F)]">
                      <span className="material-symbols-outlined text-[36px] text-[#5F5F6B]" aria-hidden="true">movie</span>
                    </div>
                  )}
                </div>
                <span className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#0B0B0F]">
                    <span className="material-symbols-outlined text-[26px]" aria-hidden="true">play_arrow</span>
                  </span>
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11px] font-semibold text-white backdrop-blur">
                  {formatDuration(video.seconds)}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C4B5FD] backdrop-blur">
                  {video.language === 'hindi' ? 'Hindi' : 'English'}
                </span>
              </button>
              <div className="p-4">
                <h2 className="truncate font-landing text-[15px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">{video.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">
                  <span>{video.voice === 'female' ? 'Female voice' : 'Male voice'} · {timeAgo(video.createdAt)}</span>
                  <span className={`inline-flex items-center gap-1 ${video.storage === 'cloud' ? 'text-[#6EE7B7]' : 'text-[#FCD34D]'}`}>
                    <span className={`h-1 w-1 rounded-full ${video.storage === 'cloud' ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`} aria-hidden="true" />
                    {video.storage === 'cloud' ? 'Saved' : 'Local only'}
                  </span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveVideo(video)}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#2B2B35] bg-[#1B1B22] px-2.5 py-1.5 text-[12px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40"
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">play_arrow</span>
                    Play
                  </button>
                  <a
                    href={video.downloadUrl || video.outputUrl}
                    download
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#2B2B35] bg-[#1B1B22] px-2.5 py-1.5 text-[12px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40"
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
                    Download
                  </a>
                  <Link
                    href={`/app/projects/${video.projectId}/video`}
                    className="ml-auto inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white"
                  >
                    Project
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeVideo ? <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
    </StudioShell>
  );
}
