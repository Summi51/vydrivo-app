'use client';

export default function ConflictNotice({ conflict, onReload, onKeep, busy = false }) {
  if (!conflict) return null;

  return (
    <section
      role="alert"
      className="mt-4 rounded-xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-4 py-3.5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-[#FCD34D]">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sync_problem</span>
            This project changed somewhere else
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#D6C48A]">
            Another tab or device saved a newer version. Reload it, or save your edits over that version.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReload}
            disabled={busy}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#2B2B35] bg-[#141419] px-3 py-1.5 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">refresh</span>
            Reload latest
          </button>
          <button
            type="button"
            onClick={onKeep}
            disabled={busy}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-3 py-1.5 text-[13px] font-semibold text-[#FCD34D] transition hover:bg-[#FBBF24]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">upload</span>
            {busy ? 'Saving…' : 'Save mine over it'}
          </button>
        </div>
      </div>
    </section>
  );
}
