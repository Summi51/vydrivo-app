'use client';

import Link from 'next/link';

const STEPS = [
  { id: 'idea', label: 'Idea', available: true },
  { id: 'storyboard', label: 'Storyboard', available: true },
  { id: 'video', label: 'Video', available: true },
  { id: 'publish', label: 'Publish', available: false },
];

export default function ProjectSteps({ projectId, active, storyboardApproved = false }) {
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.id === active));

  return (
    <nav aria-label="Project steps" className="mb-5">
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, index) => {
          const current = step.id === active;
          const done = index < activeIndex && (step.id !== 'storyboard' || storyboardApproved);
          const href = step.id === 'idea'
            ? `/app/projects/${projectId}/idea`
            : step.id === 'storyboard'
              ? `/app/projects/${projectId}`
              : step.id === 'video'
                ? `/app/projects/${projectId}/video`
                : null;
          const className = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] transition ${
            current
              ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/15 text-[#F5F5F7]'
              : step.available
                ? 'border-[#26262E] bg-[#141419] text-[#9A9AA5] hover:border-[#3B3B47] hover:text-[#F5F5F7]'
                : 'cursor-not-allowed border-[#26262E] bg-[#0F0F14] text-[#5F5F6B]'
          }`;
          const content = (
            <>
              <span
                className={`grid h-4 w-4 place-items-center rounded-full text-[11px] ${
                  current
                    ? 'bg-[#8B5CF6] text-white'
                    : done
                      ? 'bg-[#34D399]/20 text-[#6EE7B7]'
                      : 'bg-[#1B1B22] text-[#777781]'
                }`}
              >
                {done ? <span className="material-symbols-outlined text-[13px]" aria-hidden="true">check</span> : String(index + 1).padStart(2, '0')}
              </span>
              <span>{step.label}</span>
            </>
          );

          return (
            <li key={step.id} className="flex items-center gap-2">
              {href && step.available ? (
                <Link href={href} className={className} aria-current={current ? 'step' : undefined}>
                  {content}
                </Link>
              ) : (
                <span
                  className={className}
                  aria-current={current ? 'step' : undefined}
                  aria-disabled={!step.available}
                  title={step.available ? step.label : `${step.label} is the next feature.`}
                >
                  {content}
                </span>
              )}
              {index < STEPS.length - 1 ? (
                <span className="text-[14px] text-[#3F3F4A]" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
