import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function videoMetadata({ job, status, report, hasThumbnail, runId, ownerId }) {
  if (!job || typeof job !== 'object') return null;
  if (!ownerId || job.ownerId !== ownerId) return null;
  if (status?.state !== 'done') return null;
  if (job.testMode === true) return null;
  if (!UUID.test(job.projectId || '') || !UUID.test(runId || '')) return null;
  const seconds = Number(report?.seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  return {
    runId,
    projectId: job.projectId,
    title: typeof job.title === 'string' && job.title.trim() ? job.title.trim().slice(0, 160) : 'Untitled video',
    language: job.language === 'english' ? 'english' : 'hindi',
    voice: job.voice === 'female' ? 'female' : 'male',
    createdAt: typeof job.createdAt === 'string' ? job.createdAt : typeof status.updatedAt === 'string' ? status.updatedAt : null,
    seconds: Math.round(seconds * 10) / 10,
    width: Number(report.width) || 1080,
    height: Number(report.height) || 1920,
    storage: 'local',
    thumbnailUrl: hasThumbnail ? `/api/v1/projects/${job.projectId}/graphics-render/${runId}/thumbnail` : null,
    outputUrl: `/api/v1/projects/${job.projectId}/graphics-render/${runId}/file`,
    downloadUrl: `/api/v1/projects/${job.projectId}/graphics-render/${runId}/file?download=1`,
  };
}

export function listLocalVideos({ jobsDir, ownerId, limit = 60 } = {}) {
  if (!jobsDir || !ownerId) return [];
  let entries = [];
  try {
    entries = readdirSync(jobsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const videos = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'locks') continue;
    const directory = path.join(jobsDir, entry.name);
    const job = readJson(path.join(directory, 'job.json'));
    const status = readJson(path.join(directory, 'status.json'));
    const report = readJson(path.join(directory, 'report.json'));
    if (!job || !status || !report) continue;
    if (!existsSync(path.join(directory, 'output.mp4'))) continue;
    const video = videoMetadata({
      job,
      status,
      report,
      hasThumbnail: existsSync(path.join(directory, 'thumbnail.jpg')),
      runId: entry.name,
      ownerId,
    });
    if (video) videos.push(video);
  }

  videos.sort((left, right) => {
    const a = Date.parse(left.createdAt || '');
    const b = Date.parse(right.createdAt || '');
    return (Number.isFinite(b) ? b : 0) - (Number.isFinite(a) ? a : 0);
  });

  return videos.slice(0, Math.min(60, Math.max(1, Number(limit) || 60)));
}
