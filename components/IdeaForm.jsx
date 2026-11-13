'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { draftFromTopic, saveDraft } from '../lib/project-draft.js';

export default function IdeaForm() {
  const router = useRouter();
  const [topicInput, setTopicInput] = useState('');
  const [heroMessage, setHeroMessage] = useState('');

  function handleHeroSubmit(e) {
    e.preventDefault();
    const result = draftFromTopic(topicInput);
    if (!result.ok) {
      setHeroMessage(result.error);
      return;
    }
    saveDraft(window.sessionStorage, result.draft);
    router.push('/sign-in?next=/projects/new');
  }

  return (
    <div className="pt-2 max-w-xl">
      <form
        onSubmit={handleHeroSubmit}
        className="bg-black/50 backdrop-blur-xl border border-white/20 rounded-2xl p-3 sm:p-4 shadow-2xl transition-all duration-200 focus-within:border-brand-magenta/80 focus-within:shadow-[0_0_30px_rgba(217,70,239,0.25)]"
      >
        <div className="flex items-center justify-between mb-1.5">
          <label
            className="block text-[11px] font-mono uppercase tracking-wider text-white/60 font-semibold"
            htmlFor="topic-input"
          >
            Topic, Thesis, or Pasted Rough Notes
          </label>
          <span className="text-[10px] font-mono text-white/40">
            {topicInput.length > 0 ? `${topicInput.length} chars` : 'Markdown or raw text'}
          </span>
        </div>
        <textarea
          className="w-full bg-transparent border-0 resize-none text-white placeholder-white/40 text-sm focus:ring-0 focus:outline-none p-0 leading-relaxed font-body"
          id="topic-input"
          placeholder="e.g. Why modern distributed teams struggle with asynchronous code reviews and three tactical principles to fix feedback latency..."
          rows={3}
          value={topicInput}
          onChange={(e) => {
            setTopicInput(e.target.value);
            setHeroMessage('');
          }}
        />
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-white/70">
            <span className="material-symbols-outlined text-brand-coral text-base">timer</span>
            <span>Generates 60–90s 9:16 vertical structure</span>
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber text-neutral-950 font-headline font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-95 hover:shadow-lg hover:shadow-fuchsia-500/25 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <span>Start a project</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      </form>

      {/* Reassurance note */}
      <div className="mt-3 flex items-center gap-2 text-xs font-mono text-white/80 pl-1">
        <span className="text-brand-emerald font-bold">✓</span>
        <span>
          {heroMessage || 'Review your storyboard and script before video generation begins.'}
        </span>
      </div>
    </div>
  );
}
