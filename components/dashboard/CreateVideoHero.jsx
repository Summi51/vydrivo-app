'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { draftFromTopic, PENDING_TOPIC_KEY } from '../../lib/project-draft.js';
import { createProject, CURRENT_PROJECT_KEY } from '../../lib/projects-client.js';
import { DEFAULT_VOICE_PRESET } from '../../lib/voice-options.js';

const TOPIC_LIMIT = 2000;

const MODES = [
  {
    id: 'talking-head',
    label: 'Talking Head / Explainer',
    short: 'Explainer',
    icon: 'record_voice_over',
    placeholder: 'e.g. Why modern creative teams lose the thread between a rough idea and a finished cut — and a three-step way to keep the story intact.',
  },
  {
    id: 'product-teaser',
    label: 'Product Teaser',
    short: 'Teaser',
    icon: 'auto_awesome',
    placeholder: 'e.g. Tease the one feature that turns a rough note into a reviewed, finished vertical video without rebuilding the whole project.',
  },
  {
    id: 'feature-walkthrough',
    label: 'Feature Walkthrough',
    short: 'Walkthrough',
    icon: 'view_carousel',
    placeholder: 'e.g. Walk through scene revision: change one scene card, keep the narration and captions, and render only that shot again.',
  },
  {
    id: 'social-reel',
    label: 'Social Reel (9:16)',
    short: 'Reel',
    icon: 'smartphone',
    placeholder: 'e.g. Three signs your content workflow is slowing you down, and the small change that gets a rough idea to the phone faster.',
  },
];

const TARGET_LABEL = '60–90s';
const ASPECT_LABEL = '9:16 Vertical';

const SAMPLES = [
  {
    id: 'concept',
    modeId: 'talking-head',
    label: 'Explain a concept',
    topic: 'Explain RAM versus storage to beginners using a desk and filing-cabinet analogy. Keep it clear, practical and under 90 seconds.',
  },
  {
    id: 'workflow',
    modeId: 'talking-head',
    label: 'Share a workflow',
    topic: 'Why modern creative teams lose the thread between a rough idea and a finished cut — and the three-step storyboard review that fixes it.',
  },
  {
    id: 'feature',
    modeId: 'product-teaser',
    label: 'Tease a feature',
    topic: 'Tease the one feature that turns a rough note into a reviewed, finished vertical video without rebuilding the whole project.',
  },
  {
    id: 'signs',
    modeId: 'social-reel',
    label: '3 quick signs',
    topic: 'Three signs your content workflow is slowing you down, and the small change that gets a rough idea to the phone faster.',
  },
];

export default function CreateVideoHero({ draft, onSaved }) {
  const router = useRouter();
  const [modeId, setModeId] = useState('talking-head');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef(null);

  const mode = MODES.find((item) => item.id === modeId) || MODES[0];
  const canCreate = topic.trim().length > 0;

  function useSample(sample) {
    setModeId(sample.modeId);
    setTopic(sample.topic);
    setError('');
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function clearTopic() {
    setTopic('');
    setError('');
    textareaRef.current?.focus();
  }

  useEffect(() => {
    try {
      const pending = window.sessionStorage.getItem(PENDING_TOPIC_KEY);
      if (pending) {
        setTopic(pending);
        window.sessionStorage.removeItem(PENDING_TOPIC_KEY);
      }
    } catch {
      // Session storage may be unavailable; the dashboard still works without prefill.
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!canCreate) {
      setError('Add a few words about the video first, or pick a prompt below.');
      textareaRef.current?.focus();
      return;
    }
    const result = draftFromTopic(topic, {
      format: mode.label,
      formatId: mode.id,
      targetSeconds: 90,
      targetLabel: TARGET_LABEL,
      aspect: '9:16',
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      setBusy(true);
      const project = await createProject({
        title: result.draft.title,
        topic: result.draft.topic,
        audience: '',
        notes: '',
        voicePreset: DEFAULT_VOICE_PRESET,
        format: result.draft.format,
        formatId: result.draft.formatId,
        targetSeconds: result.draft.targetSeconds,
        targetLabel: result.draft.targetLabel,
        aspect: result.draft.aspect,
      });
      window.sessionStorage.setItem(CURRENT_PROJECT_KEY, project.id);
      onSaved(project);
      router.push(`/app/projects/${project.id}/idea`);
    } catch (requestError) {
      setBusy(false);
      setError(requestError.message || 'The project could not be created.');
    }
  }

  return (
    <section
      aria-labelledby="create-video-heading"
      className="studio-surface relative overflow-hidden rounded-3xl border border-[#26262E] bg-[#141419] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-7"
    >
      <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#A78BFA]/55 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-20%,rgba(139,92,246,0.26),transparent_55%),radial-gradient(circle_at_100%_120%,rgba(45,212,191,0.1),transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.8px,transparent_0.8px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top_left,black_8%,transparent_70%)]"
      />

      <div className="relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD]">
              <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                auto_awesome
              </span>
            </span>
            <div>
              <h2
                id="create-video-heading"
                className="font-landing text-xl font-bold leading-tight tracking-[-0.04em] text-[#F5F5F7] sm:text-2xl"
              >
                What video are we creating today?
              </h2>
              <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#9A9AA5]">
                Turn rough notes into a structured storyboard. Review every scene before anything is generated.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {topic ? (
              <button
                type="button"
                onClick={clearTopic}
                className="rounded-md px-1.5 py-1 text-[12px] font-medium text-[#777781] transition hover:bg-white/[0.04] hover:text-[#F5F5F7]"
              >
                Clear
              </button>
            ) : null}
            <span
              className={`font-mono text-[12px] tabular-nums tracking-[0.04em] ${
                topic.length > TOPIC_LIMIT * 0.9 ? 'text-[#FCD34D]' : 'text-[#5F5F6B]'
              }`}
            >
              {topic.length.toLocaleString()} / {TOPIC_LIMIT.toLocaleString()}
            </span>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-5 rounded-2xl border border-[#26262E] bg-[#0B0B0F]/80 p-3 transition focus-within:border-[#8B5CF6]/60 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:p-4"
        >
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#26262E] px-1 pb-3">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5F5F6B]">Try</span>
            {SAMPLES.map((sample) => {
              const active = topic === sample.topic;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => useSample(sample)}
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
                    active
                      ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/15 text-[#F5F5F7]'
                      : 'border-[#26262E] bg-[#141419] text-[#9A9AA5] hover:border-[#3B3B47] hover:text-[#F5F5F7]'
                  }`}
                >
                  {sample.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => useSample(SAMPLES[Math.floor(Math.random() * SAMPLES.length)])}
              title="Pick a random prompt"
              aria-label="Pick a random prompt"
              className="ml-auto grid h-7 w-7 place-items-center rounded-full border border-[#26262E] bg-[#141419] text-[#9A9AA5] transition hover:border-[#8B5CF6]/50 hover:text-[#C4B5FD]"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">casino</span>
            </button>
          </div>

          <label htmlFor="topic-input" className="sr-only">
            Topic or pasted notes
          </label>
          <textarea
            ref={textareaRef}
            id="topic-input"
            rows={4}
            maxLength={TOPIC_LIMIT}
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              setError('');
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={mode.placeholder}
            className="mt-3 block min-h-[112px] w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-7 text-[#F5F5F7] outline-none placeholder:text-[#5F5F6B] focus:ring-0"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#26262E] pt-3" role="group" aria-label="Video format">
            {MODES.map((item) => {
              const active = item.id === modeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  title={item.label}
                  onClick={() => {
                    setModeId(item.id);
                    setError('');
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[14px] font-semibold transition ${
                    active
                      ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/15 text-[#F5F5F7]'
                      : 'border-[#26262E] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#3A3A45] hover:text-[#F5F5F7]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${active ? 'text-[#C4B5FD]' : 'text-[#777781]'}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.short}</span>
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#26262E] bg-[#0B0B0F] px-2.5 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-[#9A9AA5]"
                title="V1 exports are 60–90 seconds."
              >
                <span className="material-symbols-outlined text-[14px] text-[#C4B5FD]" aria-hidden="true">timer</span>
                Target: {TARGET_LABEL}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#26262E] bg-[#0B0B0F] px-2.5 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-[#9A9AA5]"
                title="V1 exports are 1080 × 1920 vertical."
              >
                <span className="material-symbols-outlined text-[14px] text-[#C4B5FD]" aria-hidden="true">aspect_ratio</span>
                {ASPECT_LABEL}
              </span>
            </div>
            <button
              type="submit"
              disabled={busy || !canCreate}
              title={canCreate ? 'Create a project and open the idea step (⌘/Ctrl+Enter)' : 'Add a topic first.'}
              className="group inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:w-auto"
            >
              {busy ? 'Creating project…' : 'Create project & continue'}
              <span className="material-symbols-outlined text-[17px] transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </form>

        <div className="mt-3 flex min-h-5 items-center gap-2 px-1" aria-live="polite">
          {error ? (
            <p role="alert" className="text-[13px] font-medium text-[#FCA5A5]">{error}</p>
          ) : !canCreate ? (
            <p className="text-[13px] leading-5 text-[#5F5F6B]">
              Pick a prompt or write a few words to continue.
              <span className="hidden sm:inline"> Tip: press ⌘/Ctrl+Enter to create.</span>
            </p>
          ) : (
            <p className="text-[14px] leading-5 text-[#5F5F6B]">
              Creates a project and opens the idea step. Longer notes can be added there before any storyboard or video work begins.
            </p>
          )}
        </div>

        {draft ? (
          <p className="px-1 text-[14px] text-[#5F5F6B]">
            A draft is already waiting below{draft.title ? `: ${draft.title.replace(/[.!?]+$/, '')}` : ''}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
