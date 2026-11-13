function sceneIssue(scene) {
  if (!String(scene.narration || '').trim()) return 'Needs narration';
  if (!String(scene.visualPrompt || '').trim()) return 'Needs visual intent';
  return '';
}

export default function SceneRail({ scenes, selectedId, onSelect, onAdd }) {
  return (
    <aside
      className="studio-surface min-w-0 rounded-2xl border border-[#2B2B35] bg-[#141419] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)] xl:sticky xl:top-24 xl:self-start"
      aria-label="Storyboard scenes"
    >
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Storyboard</p>
          <h2 className="mt-0.5 font-landing text-base font-bold text-[#F5F5F7]">
            Scenes <span className="font-mono text-[13px] font-medium text-[#8A8A96]">{scenes.length}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add scene"
          title="Add scene"
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#8B5CF6]/50 hover:text-[#C4B5FD]"
        >
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
        </button>
      </div>

      {scenes.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
          {scenes.map((scene, index) => {
            const active = scene.id === selectedId;
            const issue = sceneIssue(scene);
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelect(scene.id)}
                aria-current={active ? 'true' : undefined}
                className={`min-w-[176px] rounded-xl border p-3 text-left transition xl:min-w-0 ${
                  active
                    ? 'border-[#8B5CF6]/60 bg-[#1B1626] shadow-[0_0_0_1px_rgba(139,92,246,0.25)]'
                    : 'border-[#26262E] bg-[#0B0B0F] hover:border-[#3B3B47] hover:bg-[#141419]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-md font-mono text-[12px] font-bold ${
                      active ? 'bg-[#8B5CF6] text-white' : 'bg-[#141419] text-[#777781] ring-1 ring-[#26262E]'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={`material-symbols-outlined text-[15px] ${active ? 'text-[#C4B5FD]' : 'text-[#5F5F6B]'}`} aria-hidden="true">
                    {scene.visualKind === 'motion-graphics' ? 'palette' : 'movie'}
                  </span>
                </div>
                <p className={`mt-2 line-clamp-2 text-[14px] font-semibold leading-5 ${active ? 'text-[#F5F5F7]' : 'text-[#9A9AA5]'}`}>
                  {scene.title || `Scene ${index + 1}`}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] text-[#8A8A96]">{scene.estimatedSeconds || 0}s</span>
                  {issue ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#FBBF24]" title={issue}>
                      <span className="h-1 w-1 rounded-full bg-[#FBBF24]" aria-hidden="true" />
                      {issue === 'Needs narration' ? 'No script' : 'No visual'}
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" title="Scene has narration and visual intent" aria-hidden="true" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-3 py-5 text-center">
          <span className="material-symbols-outlined text-[22px] text-[#5F5F6B]" aria-hidden="true">view_carousel</span>
          <p className="mt-1.5 text-[14px] font-semibold text-[#9A9AA5]">No scenes yet</p>
          <p className="mt-1 text-[13px] leading-5 text-[#8A8A96]">Add one manually or plan from the brief.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2B2B35] bg-[#0B0B0F] px-3 py-2.5 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#8B5CF6]/45 hover:text-[#C4B5FD]"
      >
        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
        Add scene
      </button>
    </aside>
  );
}
