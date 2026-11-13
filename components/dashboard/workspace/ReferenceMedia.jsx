'use client';

import { useEffect, useRef, useState } from 'react';
import {
  deleteMediaAsset,
  finalizeMediaAsset,
  getMediaAccessUrl,
  listMediaAssets,
  uploadReferenceFile,
} from '../../../lib/media-client.js';
import { formatMediaBytes, MEDIA_ACCEPT } from '../../../lib/media-rules.js';
import { REFERENCE_FILE_HINT } from '../../../lib/media-upload.js';

function StatusBadge({ asset }) {
  if (asset.status === 'validated') {
    return (
      <span className="rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#6EE7B7]">
        Ready
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[#FBBF24]/35 bg-[#FBBF24]/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#FBBF24]">
      Waiting
    </span>
  );
}

export default function ReferenceMedia({ projectId }) {
  const [assets, setAssets] = useState([]);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [previews, setPreviews] = useState({});
  const [previewAsset, setPreviewAsset] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const inputRef = useRef(null);
  const previewFetches = useRef(new Set());

  async function refresh() {
    const data = await listMediaAssets(projectId);
    setAssets(data.assets || []);
    setQuota(data.quota || null);
    return data;
  }

  useEffect(() => {
    let active = true;
    setAssets([]);
    setQuota(null);
    setPreviews({});
    setUploadError('');
    setDeleteId('');
    setPreviewAsset(null);
    setPreviewUrl('');
    setPreviewError('');
    previewFetches.current = new Set();
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await listMediaAssets(projectId);
        if (!active) return;
        setAssets(data.assets || []);
        setQuota(data.quota || null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Could not load reference media.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    const missing = assets.filter((asset) => (
      asset.status === 'validated'
      && asset.mime?.startsWith('image/')
      && !previewFetches.current.has(asset.id)
    ));
    missing.forEach(async (asset) => {
      previewFetches.current.add(asset.id);
      try {
        const data = await getMediaAccessUrl(asset.key);
        if (active) setPreviews((current) => ({ ...current, [asset.id]: data.url }));
      } catch {
        if (active) setPreviews((current) => ({ ...current, [asset.id]: '' }));
      }
    });
    return () => { active = false; };
  }, [assets]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;
    setUploadError('');
    setUploading(true);
    setStage('preparing');
    try {
      const data = await uploadReferenceFile(file, { projectId, onStage: setStage });
      setAssets((current) => [data.asset, ...current.filter((asset) => asset.id !== data.asset.id)]);
      setQuota(data.quota || null);
    } catch (uploadFailure) {
      setUploadError(uploadFailure.message || 'Upload failed.');
      await refresh().catch(() => {});
    } finally {
      setUploading(false);
      setStage('');
    }
  }

  async function retryFinalize(asset) {
    if (busyId) return;
    setBusyId(asset.id);
    setUploadError('');
    try {
      const data = await finalizeMediaAsset(asset.id);
      setAssets((current) => current.map((item) => (item.id === data.asset.id ? data.asset : item)));
      setQuota(data.quota || null);
    } catch (failure) {
      setUploadError(failure.message || 'Could not check the upload.');
      await refresh().catch(() => {});
    } finally {
      setBusyId('');
    }
  }

  async function remove(asset) {
    if (busyId) return;
    setBusyId(asset.id);
    setUploadError('');
    try {
      const data = await deleteMediaAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setQuota(data.quota || null);
      setDeleteId('');
    } catch (failure) {
      setUploadError(failure.message || 'Could not remove this reference.');
    } finally {
      setBusyId('');
    }
  }

  async function openPreview(asset) {
    setPreviewAsset(asset);
    setPreviewUrl('');
    setPreviewError('');
    try {
      const data = await getMediaAccessUrl(asset.key);
      setPreviewUrl(data.url);
    } catch (failure) {
      setPreviewError(failure.message || 'Preview is unavailable.');
    }
  }

  function closePreview() {
    setPreviewAsset(null);
    setPreviewUrl('');
    setPreviewError('');
  }

  const usedBytes = Number(quota?.usedBytes) || 0;
  const limitBytes = Number(quota?.limitBytes) || 0;
  const usedPercent = limitBytes ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const stageLabel = stage === 'preparing'
    ? 'Preparing upload…'
    : stage === 'uploading'
      ? 'Uploading file…'
      : stage === 'checking'
        ? 'Checking file…'
        : 'Uploading…';

  return (
    <section className="studio-surface rounded-3xl border border-[#2B2B35] bg-[#141419] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C4B5FD]">Reference media</p>
            <span className="rounded-full border border-[#2B2B35] bg-[#0E0E13] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#8A8A96]">
              Optional
            </span>
          </div>
          <h2 className="mt-1 font-landing text-2xl font-bold tracking-[-0.035em] text-[#F5F5F7]">Show the look you want</h2>
          <p className="mt-1 max-w-xl text-[14px] leading-6 text-[#9A9AA5]">
            Add a product image, a mood frame or a short clip. Files stay private to this project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#3B3B47] bg-[#1B1B22] px-3 py-2 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">upload</span>
          {uploading ? stageLabel : 'Add reference'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          onChange={handleFile}
          className="sr-only"
          aria-label="Add reference media"
        />
      </div>

      <p className="mt-2 text-[12px] leading-5 text-[#8A8A96]">
        {REFERENCE_FILE_HINT} References are saved for later scene work; footage generation does not use them yet.
      </p>

      {limitBytes ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-[12px] text-[#777781]">
            <span>{formatMediaBytes(usedBytes)} of {formatMediaBytes(limitBytes)} used</span>
            <span className="font-mono tabular-nums">{usedPercent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#26262E]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPercent} aria-label="Reference media storage used">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
      ) : null}

      {uploadError ? (
        <div role="alert" className="mt-4 rounded-xl border border-[#F87171]/35 bg-[#F87171]/10 p-3">
          <p className="text-[13px] leading-5 text-[#FCA5A5]">{uploadError}</p>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mt-4 rounded-xl border border-[#F87171]/35 bg-[#F87171]/10 p-3">
          <p className="text-[13px] leading-5 text-[#FCA5A5]">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden="true">
          {[0, 1].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl border border-[#26262E] bg-[#1B1B22]" />
          ))}
        </div>
      ) : null}

      {!loading && !error && !assets.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#3B3B47] bg-[#0F0F14] px-4 py-6 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-[#34343F] bg-[#1B1B22] text-[#C4B5FD]">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">image</span>
          </span>
          <p className="mt-2 text-[14px] font-semibold text-[#F5F5F7]">No reference media yet</p>
          <p className="mt-1 text-[13px] leading-5 text-[#8A8A96]">Add one image or short clip, or continue without a reference.</p>
        </div>
      ) : null}

      {!loading && assets.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {assets.map((asset) => {
            const imagePreview = previews[asset.id];
            const isImage = asset.mime?.startsWith('image/');
            const busy = busyId === asset.id;
            const native = asset.nativeProperties;
            const dimensions = native?.width && native?.height ? `${native.width} × ${native.height}` : '';
            const duration = native?.durationMs ? `${(native.durationMs / 1000).toFixed(1)}s` : '';
            return (
              <article key={asset.id} className="overflow-hidden rounded-xl border border-[#34343F] bg-[#1B1B22]">
                <button
                  type="button"
                  onClick={() => openPreview(asset)}
                  className="relative block h-28 w-full overflow-hidden bg-[#0B0B0F] text-left"
                  aria-label={`Preview ${asset.filename}`}
                >
                  {isImage && imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                      onError={() => setPreviews((current) => ({ ...current, [asset.id]: '' }))}
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[#777781]">
                      <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                        {isImage ? 'image' : 'movie'}
                      </span>
                    </span>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#D4D4DE]">
                    {isImage ? 'Image' : 'Video'}
                  </span>
                </button>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#F5F5F7]" title={asset.filename}>
                      {asset.filename}
                    </p>
                    <StatusBadge asset={asset} />
                  </div>
                  <p className="mt-1 text-[12px] text-[#777781]">
                    {formatMediaBytes(asset.bytes || asset.declaredBytes)} · {asset.mime}
                    {dimensions ? ` · ${dimensions}` : ''}
                    {duration ? ` · ${duration}` : ''}
                  </p>

                  {asset.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => retryFinalize(asset)}
                      disabled={busy}
                      className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-[#FBBF24]/35 bg-[#FBBF24]/10 px-2.5 py-1.5 text-[12px] font-semibold text-[#FBBF24] transition hover:bg-[#FBBF24]/15 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">refresh</span>
                      {busy ? 'Checking…' : 'Check upload'}
                    </button>
                  ) : null}

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPreview(asset)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#3B3B47] bg-[#141419] px-2.5 py-1.5 text-[12px] font-semibold text-[#C9C9D4] transition hover:border-[#8B5CF6]/50 hover:text-white disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">visibility</span>
                      Preview
                    </button>
                    {deleteId === asset.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => remove(asset)}
                          disabled={busy}
                          className="rounded-lg border border-[#F87171]/45 bg-[#F87171]/10 px-2.5 py-1.5 text-[12px] font-semibold text-[#FCA5A5] transition hover:bg-[#F87171]/15 disabled:opacity-40"
                        >
                          {busy ? 'Removing…' : 'Remove'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId('')}
                          disabled={busy}
                          className="rounded-lg border border-[#3B3B47] bg-[#141419] px-2.5 py-1.5 text-[12px] font-semibold text-[#9A9AA5] transition hover:text-white disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteId(asset.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#3B3B47] bg-[#141419] px-2.5 py-1.5 text-[12px] font-semibold text-[#9A9AA5] transition hover:border-[#F87171]/40 hover:text-[#FCA5A5] disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[13px]" aria-hidden="true">delete</span>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {previewAsset ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${previewAsset.filename}`}>
          <div className="w-full max-w-3xl rounded-2xl border border-[#34343F] bg-[#141419] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[14px] font-semibold text-[#F5F5F7]">{previewAsset.filename}</p>
              <button
                type="button"
                onClick={closePreview}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#3B3B47] bg-[#1B1B22] text-[#C9C9D4] transition hover:text-white"
                aria-label="Close preview"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="mt-3 grid min-h-[220px] place-items-center rounded-xl bg-[#0B0B0F]">
              {previewError ? (
                <p className="px-4 text-[13px] text-[#FCA5A5]">{previewError}</p>
              ) : previewUrl ? (
                previewAsset.mime?.startsWith('video/') ? (
                  <video
                    controls
                    autoPlay
                    className="max-h-[70vh] w-full rounded-xl"
                    src={previewUrl}
                    onError={() => setPreviewError('Preview could not be loaded.')}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={previewAsset.filename}
                    className="max-h-[70vh] w-full rounded-xl object-contain"
                    onError={() => setPreviewError('Preview could not be loaded.')}
                  />
                )
              ) : (
                <p className="text-[13px] text-[#8A8A96]">Loading preview…</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
