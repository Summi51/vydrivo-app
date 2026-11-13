'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function ScenePreview({ project, scene, index }) {
  const vertical = (project.aspect || '9:16') === '9:16';
  return (
    <div className="mx-auto w-full max-w-[200px]">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-[#2B2B35] bg-[#0E0E13]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(139,92,246,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.18)_1px,transparent_1px)] [background-size:33.33%_33.33%]"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="rounded border border-[#26262E] bg-[#141419] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#9A9AA5]">
            {vertical ? '9:16 VERTICAL' : project.aspect || '9:16'}
          </span>
          <span className="rounded border border-[#26262E] bg-[#141419] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#8A8A96]">
            SAFE ZONE
          </span>
        </div>

        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl border border-dashed border-[#8B5CF6]/45 bg-[#141419]/70 px-2 py-4 text-center">
          <span className="material-symbols-outlined text-[20px] text-[#C4B5FD]" aria-hidden="true">
            {scene.visualKind === 'motion-graphics' ? 'palette' : 'videocam'}
          </span>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9A9AA5]">Camera beat</p>
        </div>

        <div className="absolute inset-x-4 bottom-7">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-[#8A8A96]">
            <span>Caption area</span>
            <span>Synced</span>
          </div>
          <div className="mt-1 space-y-1">
            <span className="block h-1 w-full rounded-full bg-[#2B2B35]" />
            <span className="block h-1 w-2/3 rounded-full bg-[#2B2B35]" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-[#26262E] bg-[#0B0B0F]/90 px-2 py-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#8A8A96]">Layout guide · not rendered footage</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-[#8A8A96]">
        <span>1080 × 1920</span>
        <span>{String(index + 1).padStart(2, '0')} · {scene.estimatedSeconds || 0}s</span>
      </div>
    </div>
  );
}

export default function SceneEditor({
  project,
  scene,
  index,
  total,
  referenceAssets = [],
  referenceLoading = false,
  referenceError = '',
  onAdd,
  onGenerate,
  generating,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [scene?.id]);

  if (!scene) {
    return (
      <section className="studio-surface flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-[#2B2B35] bg-[#141419] p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
        <span className="grid h-14 w-14 place-items-center rounded-xl border border-[#26262E] bg-[#0B0B0F] text-[#C4B5FD]">
          <span className="material-symbols-outlined text-[27px]" aria-hidden="true">dashboard_customize</span>
        </span>
        <h2 className="mt-4 font-landing text-2xl font-bold tracking-[-0.035em] text-[#F5F5F7]">Start the storyboard</h2>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-[#9A9AA5]">
          Generate a candidate from your saved topic, or add a scene and write the narration and visual intent yourself.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating || !project.topic}
              title={project.topic ? 'Generate a storyboard candidate.' : 'Add a topic in the idea step first.'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
              {generating ? 'Generating…' : 'Generate storyboard'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition ${
              onGenerate
                ? 'border border-[#2B2B35] bg-[#141419] text-[#9A9AA5] hover:border-[#3B3B47] hover:text-[#F5F5F7]'
                : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
            Add first scene
          </button>
          <Link
            href={`/app/projects/${project.id}/idea`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[14px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_note</span>
            Open idea step
          </Link>
        </div>
        <p className="mt-4 max-w-sm text-[13px] leading-5 text-[#8A8A96]">
          Generation uses the saved topic and audience/notes. Review and edit every scene before approval.
        </p>
      </section>
    );
  }

  const seconds = Number(scene.estimatedSeconds) || 0;
  const selectedReference = referenceAssets.find((asset) => asset.id === scene.referenceAssetId);
  const missingReference = Boolean(scene.referenceAssetId) && !selectedReference;

  return (
    <section className="studio-surface min-w-0 self-start rounded-2xl border border-[#2B2B35] bg-[#141419] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-6" aria-labelledby="scene-editor-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8A8A96]">
            Scene {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}
          </p>
          <h2 id="scene-editor-heading" className="mt-1 font-landing text-2xl font-bold tracking-[-0.035em] text-[#F5F5F7]">Scene canvas</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move scene up"
            title="Move scene up"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move scene down"
            title="Move scene down"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_downward</span>
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicate scene"
            title="Duplicate scene"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmDelete) onDelete();
              else setConfirmDelete(true);
            }}
            aria-label={confirmDelete ? 'Confirm delete scene' : 'Delete scene'}
            title={confirmDelete ? 'Confirm delete scene' : 'Delete scene'}
            className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2 text-[13px] font-semibold transition ${
              confirmDelete
                ? 'border-[#F87171]/40 bg-[#F87171]/10 text-[#FCA5A5]'
                : 'border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#F87171]/40 hover:text-[#FCA5A5]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
            {confirmDelete ? 'Confirm' : ''}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]">
        <ScenePreview project={project} scene={scene} index={index} />

        <div className="min-w-0 space-y-3">
          <label className="block">
            <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Scene title</span>
            <input
              type="text"
              maxLength={120}
              value={scene.title || ''}
              onChange={(event) => onChange({ title: event.target.value })}
              className="mt-1 w-full rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 font-landing text-[15px] font-semibold text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              placeholder="Name this scene"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Narration</span>
              <span className="font-mono text-[11px] tabular-nums text-[#8A8A96]">{(scene.narration || '').length} / 700</span>
            </span>
            <textarea
              rows={4}
              maxLength={700}
              value={scene.narration || ''}
              onChange={(event) => onChange({ narration: event.target.value })}
              className="mt-1 w-full resize-y rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] leading-6 text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              placeholder="Write the spoken narration for this scene…"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Visual intent</span>
              <span className="font-mono text-[11px] tabular-nums text-[#8A8A96]">{(scene.visualPrompt || '').length} / 2,000</span>
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={scene.visualPrompt || ''}
              onChange={(event) => onChange({ visualPrompt: event.target.value })}
              className="mt-1 w-full resize-y rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] leading-6 text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              placeholder="Describe what the camera sees, the setting, and the mood…"
            />
          </label>

          <div className="rounded-xl border border-[#2B2B35] bg-[#0E0E13] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Scene reference</span>
              <span className="flex items-center gap-2">
                {scene.referenceAssetId ? (
                  <span className="rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#C4B5FD]">
                    Bound
                  </span>
                ) : null}
                {scene.referenceAssetId ? (
                  <button
                    type="button"
                    onClick={() => onChange({ referenceAssetId: null })}
                    className="rounded-lg border border-[#3B3B47] bg-[#141419] px-2 py-1 text-[12px] font-semibold text-[#9A9AA5] transition hover:border-[#8B5CF6]/50 hover:text-white"
                  >
                    Clear
                  </button>
                ) : null}
              </span>
            </div>

            {referenceError ? (
              <p className="mt-1.5 text-[12px] leading-5 text-[#FCA5A5]">{referenceError}</p>
            ) : null}
            {referenceLoading ? (
              <p className="mt-1.5 text-[12px] leading-5 text-[#777781]">Loading references…</p>
            ) : null}
            {!referenceLoading && !referenceError && !referenceAssets.length ? (
              <p className="mt-1.5 text-[12px] leading-5 text-[#777781]">
                No validated references yet.{' '}
                <Link
                  href={`/app/projects/${project.id}/idea`}
                  className="text-[#C4B5FD] underline decoration-[#8B5CF6]/40 underline-offset-2"
                >
                  Add reference media
                </Link>
                .
              </p>
            ) : null}
            {!referenceLoading && !referenceError && referenceAssets.length ? (
              <select
                value={scene.referenceAssetId || ''}
                onChange={(event) => onChange({ referenceAssetId: event.target.value || null })}
                className="mt-2 w-full rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2.5 text-[14px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                aria-label="Scene reference media"
              >
                <option value="">No reference</option>
                {missingReference ? <option value={scene.referenceAssetId} disabled>Missing saved reference</option> : null}
                {referenceAssets.map((asset) => {
                  const native = asset.nativeProperties;
                  const detail = native?.kind === 'video' && native.durationMs
                    ? `${(native.durationMs / 1000).toFixed(1)}s`
                    : native?.width
                      ? `${native.width}×${native.height}`
                      : asset.mime;
                  return <option key={asset.id} value={asset.id}>{asset.filename} · {detail}</option>;
                })}
              </select>
            ) : null}
            {selectedReference ? (
              <p className="mt-1.5 text-[12px] leading-5 text-[#8A8A96]">
                {selectedReference.filename} · {selectedReference.mime}
                {selectedReference.nativeProperties?.width ? ` · ${selectedReference.nativeProperties.width}×${selectedReference.nativeProperties.height}` : ''}
                {selectedReference.nativeProperties?.durationMs ? ` · ${(selectedReference.nativeProperties.durationMs / 1000).toFixed(1)}s` : ''}
              </p>
            ) : null}
            {!referenceLoading && !referenceError && missingReference ? (
              <p className="mt-1.5 text-[12px] leading-5 text-[#FBBF24]">
                This saved reference is no longer available. Choose another or select “No reference”.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Visual kind</span>
              <div className="mt-1 flex gap-1.5">
                {[
                  ['ai-generated-footage', 'movie', 'AI footage'],
                  ['motion-graphics', 'palette', 'Graphics'],
                ].map(([value, icon, label]) => {
                  const active = scene.visualKind === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ visualKind: value })}
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-2 text-[13px] font-semibold transition ${
                        active
                          ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/15 text-[#F5F5F7]'
                          : 'border-[#26262E] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#3B3B47]'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[14px] ${active ? 'text-[#C4B5FD]' : 'text-[#5F5F6B]'}`} aria-hidden="true">
                        {icon}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Seconds</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={Math.min(30, Math.max(2, seconds || 2))}
                  onChange={(event) => onChange({ estimatedSeconds: Number(event.target.value) })}
                  className="w-16 accent-[#8B5CF6]"
                  aria-label="Scene duration in seconds"
                />
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={seconds || ''}
                  onChange={(event) => onChange({ estimatedSeconds: Number(event.target.value) })}
                  className="w-12 rounded-lg border border-[#26262E] bg-[#0B0B0F] px-1.5 py-1.5 text-center font-mono text-[14px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6]"
                  aria-label="Scene duration in seconds"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-[#26262E] pt-3 text-[13px] leading-5 text-[#8A8A96]">
        Editing a scene resets storyboard approval. The preview is a layout guide, not rendered footage.
      </p>
    </section>
  );
}
