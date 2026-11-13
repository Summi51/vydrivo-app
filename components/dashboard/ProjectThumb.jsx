export const MODE_THEMES = {
  'talking-head': 'from-[#4C1D95] via-[#6D28D9] to-[#111827]',
  'product-teaser': 'from-[#312E81] via-[#4338CA] to-[#0B0B0F]',
  'feature-walkthrough': 'from-[#064E3B] via-[#0F766E] to-[#0B0B0F]',
  'social-reel': 'from-[#4C1D95] via-[#7C3AED] to-[#1E1B4B]',
};

const TONES = {
  draft: 'bg-[#FBBF24]/15 text-[#FCD34D] ring-1 ring-inset ring-[#FBBF24]/30',
  planning: 'bg-[#8B5CF6]/20 text-[#DDD6FE] ring-1 ring-inset ring-[#8B5CF6]/40',
  approved: 'bg-[#34D399]/15 text-[#6EE7B7] ring-1 ring-inset ring-[#34D399]/30',
  generating: 'bg-[#8B5CF6]/20 text-[#DDD6FE] ring-1 ring-inset ring-[#8B5CF6]/40',
  ready: 'bg-[#34D399]/15 text-[#6EE7B7] ring-1 ring-inset ring-[#34D399]/30',
  failed: 'bg-[#F87171]/15 text-[#FCA5A5] ring-1 ring-inset ring-[#F87171]/30',
};

export default function ProjectThumb({
  formatId = 'talking-head',
  badge = 'DRAFT',
  tone = 'draft',
  duration = '—:—',
  label = '',
  compact = false,
  className = '',
}) {
  const theme = MODE_THEMES[formatId] || MODE_THEMES['talking-head'];
  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-[16px] bg-gradient-to-br ${theme} ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:16px_16px]"
      />
      <div aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/20" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full border border-white/15" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
        {compact ? null : (
          <span className="rounded-md bg-black/35 px-1.5 py-1 font-mono text-[11px] font-semibold text-white/80 backdrop-blur-sm">9:16</span>
        )}
        <span className={`rounded-md px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] backdrop-blur-sm ${TONES[tone] || TONES.draft}`}>
          {badge}
        </span>
      </div>

      {compact ? null : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <div className="relative h-[58%] w-[30%] min-w-[52px] rounded-md border border-white/20 bg-black/10">
            <span className="absolute inset-x-2 top-2 h-1 rounded bg-white/25" />
            <span className="absolute inset-x-2 top-4 h-1 w-2/3 rounded bg-white/15" />
            <span className="absolute inset-x-2 bottom-2 h-1/3 rounded bg-white/10" />
          </div>
        </div>
      )}

      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
        {compact || !label ? null : (
          <span className="font-mono text-[11px] font-semibold text-white/70">{label}</span>
        )}
        <span className="ml-auto font-mono text-[11px] font-semibold text-white/80">{duration}</span>
      </div>
    </div>
  );
}
