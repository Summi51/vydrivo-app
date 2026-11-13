'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CURRENT_PROJECT_KEY, getIdeaSuggestions, getProject, isProjectConflict, suggestIdeas, updateProject } from '../../lib/projects-client.js';
import { loadIdeaSuggestions, saveIdeaSuggestions } from '../../lib/idea-suggestions-cache.js';
import { createSerialQueue } from '../../lib/serial-queue.js';
import { DEFAULT_VOICE_PRESET, VOICE_OPTIONS, voiceOption } from '../../lib/voice-options.js';
import StudioShell from './StudioShell';
import ConflictNotice from './workspace/ConflictNotice';
import ProjectSteps from './workspace/ProjectSteps';
import ReferenceMedia from './workspace/ReferenceMedia';

const TOPIC_LIMIT = 2000;
const AUDIENCE_LIMIT = 500;
const NOTES_LIMIT = 20000;
const FEEDBACK_LIMIT = 1000;

function suggestionErrorMessage(message) {
  const text = String(message || '');
  if (/outside the allowed length|must be text|unsupported characters|must not contain links|duplicate suggestion|3–5 suggestions|did not return valid JSON|did not return an idea object|planner response was rejected/i.test(text)) {
    return 'The AI returned an unusable direction. Try again, or shorten the brief.';
  }
  return text || 'Idea suggestions failed.';
}

function CharacterCount({ value, max }) {
  return (
    <span className="font-mono text-[12px] tabular-nums tracking-[0.04em] text-[#5F5F6B]">
      {value.length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

function FieldLabel({ htmlFor, children, count }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="font-landing text-[12px] font-semibold uppercase tracking-[0.14em] text-[#C9C9D4]">
        {children}
      </label>
      {count}
    </div>
  );
}

function SuggestionCard({ suggestion, index, expanded, onToggle, onUse }) {
  return (
    <article className="rounded-xl border border-[#34343F] bg-[#1B1B22] p-3.5 transition hover:border-[#8B5CF6]/55">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#8B5CF6] font-mono text-[11px] font-bold text-white" aria-hidden="true">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-landing text-[15px] font-semibold leading-5 tracking-[-0.02em] text-[#F5F5F7]">
            {suggestion.title}
          </h3>
          <p className="mt-1 text-[13px] leading-5 text-[#C9C9D4]">{suggestion.hook}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onUse}
          className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#8B5CF6] px-2.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#7C3AED]"
        >
          Use this direction
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#3B3B47] bg-[#141419] px-2.5 py-2 text-[12px] font-semibold text-[#C9C9D4] transition hover:border-[#8B5CF6]/50 hover:text-white"
        >
          {expanded ? 'Hide' : 'Details'}
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{expanded ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-[#34343F] pt-3">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Angle</p>
            <p className="mt-1 text-[13px] leading-5 text-[#C9C9D4]">{suggestion.angle}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Outline</p>
            <ol className="mt-1 space-y-1.5">
              {suggestion.outline.map((line, lineIndex) => (
                <li key={`${suggestion.title}-${lineIndex}`} className="flex gap-2 text-[13px] leading-5 text-[#C9C9D4]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#A78BFA]" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9AA5]">Visual direction</p>
            <p className="mt-1 text-[13px] leading-5 text-[#C9C9D4]">{suggestion.visualDirection}</p>
          </div>
          <div className="rounded-lg border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 p-2.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4B5FD]">Sample 5s scene prompt</p>
            <p className="mt-1 max-h-44 overflow-y-auto whitespace-pre-wrap pr-1 text-[12px] leading-5 text-[#DDD6FE]">{suggestion.sampleScenePrompt}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function BriefRow({ label, value, tone = 'text-[#F5F5F7]' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#26262E]/70 py-2.5 first:pt-0 last:border-0 last:pb-0">
      <span className="text-[13px] text-[#8A8A96]">{label}</span>
      <span className={`max-w-[60%] truncate text-right text-[14px] font-medium ${tone}`}>{value}</span>
    </div>
  );
}

export default function IdeaWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [notes, setNotes] = useState('');
  const [voicePreset, setVoicePreset] = useState(DEFAULT_VOICE_PRESET);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestSource, setSuggestSource] = useState('');
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [continuing, setContinuing] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [conflictBusy, setConflictBusy] = useState(false);
  const hydrated = useRef(false);
  const saveSeq = useRef(0);
  const skipNextSave = useRef(true);
  const projectRef = useRef(null);
  const writeQueue = useRef(null);
  if (!writeQueue.current) writeQueue.current = createSerialQueue();

  function applyProject(current) {
    projectRef.current = current;
    setProject(current);
  }

  function applyServerFields(current) {
    setTopic(current.topic || '');
    setAudience(current.audience || '');
    setNotes(current.notes || '');
    setVoicePreset(current.voicePreset || DEFAULT_VOICE_PRESET);
  }

  useEffect(() => {
    skipNextSave.current = true;
    let active = true;
    (async () => {
      try {
        const current = await getProject(projectId);
        if (!active) return;
        applyProject(current);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
        applyServerFields(current);
        setSaveStatus('saved');
        hydrated.current = true;
        let serverSuggestions = null;
        try {
          serverSuggestions = await getIdeaSuggestions(current.id);
        } catch {
          // The saved-directions endpoint can be unavailable before migration
          // 0003 is applied; the browser cache still covers this session.
        }
        if (!active) return;
        const cached = loadIdeaSuggestions(current.id);
        if (serverSuggestions?.suggestions?.length) {
          setSuggestions(serverSuggestions.suggestions);
          setSuggestSource(serverSuggestions.sourceTopic || '');
          saveIdeaSuggestions(current.id, {
            suggestions: serverSuggestions.suggestions,
            sourceTopic: serverSuggestions.sourceTopic || '',
          });
        } else if (cached) {
          setSuggestions(cached.suggestions);
          setSuggestSource(cached.sourceTopic || '');
        } else {
          setSuggestions([]);
          setSuggestSource('');
        }
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || 'Could not load this project.');
        projectRef.current = null;
        setProject(null);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!hydrated.current || !project) return undefined;
    if (conflict) return undefined;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    if (!topic.trim()) {
      setSaveStatus('idle');
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      const sequence = ++saveSeq.current;
      const payload = { topic: topic.trim(), audience, notes, voicePreset };
      setSaveStatus('saving');
      try {
        const saved = await writeQueue.current(() => updateProject(project.id, payload, {
          baseUpdatedAt: projectRef.current?.updatedAt,
        }));
        // A superseded write still advanced the server version, so the next
        // queued write must use it even when this response no longer drives the UI.
        projectRef.current = saved;
        if (sequence !== saveSeq.current) return;
        applyProject(saved);
        setSaveStatus('saved');
        setConflict(null);
      } catch (error) {
        if (sequence !== saveSeq.current) return;
        if (isProjectConflict(error)) {
          setConflict(error.details?.project || projectRef.current);
          setSaveStatus('conflict');
          return;
        }
        setSaveStatus('error');
        setNotice(error.message || 'Could not save this idea.');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [project?.id, topic, audience, notes, voicePreset, conflict]);

  async function persist({ announce = false } = {}) {
    if (!project) return null;
    if (!topic.trim()) {
      setNotice('Add a topic before saving.');
      return null;
    }
    const sequence = ++saveSeq.current;
    const payload = { topic: topic.trim(), audience, notes, voicePreset };
    setSaveStatus('saving');
    try {
      const saved = await writeQueue.current(() => updateProject(project.id, payload, {
        baseUpdatedAt: projectRef.current?.updatedAt,
      }));
      projectRef.current = saved;
      if (sequence === saveSeq.current) {
        applyProject(saved);
        setSaveStatus('saved');
        setConflict(null);
        if (announce) setNotice('Idea saved.');
      }
      return saved;
    } catch (error) {
      if (isProjectConflict(error)) {
        setConflict(error.details?.project || projectRef.current);
        setSaveStatus('conflict');
        setNotice('This project changed somewhere else. Reload it or save your edits over it.');
        return null;
      }
      setSaveStatus('error');
      setNotice(error.message || 'Could not save this idea.');
      return null;
    }
  }

  function reloadConflict() {
    if (!conflict) return;
    skipNextSave.current = true;
    applyProject(conflict);
    applyServerFields(conflict);
    setSaveStatus('saved');
    setConflict(null);
    setNotice('Loaded the latest saved version.');
  }

  async function keepMineOverConflict() {
    if (!conflict || conflictBusy) return;
    if (!topic.trim()) {
      setNotice('Add a topic before saving.');
      return;
    }
    setConflictBusy(true);
    const sequence = ++saveSeq.current;
    try {
      const saved = await writeQueue.current(() => updateProject(project.id, {
        topic: topic.trim(),
        audience,
        notes,
        voicePreset,
      }, { baseUpdatedAt: conflict.updatedAt }));
      if (sequence === saveSeq.current) {
        applyProject(saved);
        setSaveStatus('saved');
        setConflict(null);
        setNotice('Your edits were saved over the newer version.');
      }
    } catch (error) {
      if (isProjectConflict(error)) {
        setConflict(error.details?.project || conflict);
        setNotice('The project changed again. Reload it before saving.');
      } else {
        setSaveStatus('error');
        setNotice(error.message || 'Could not save this idea.');
      }
    } finally {
      setConflictBusy(false);
    }
  }

  async function continueToStoryboard() {
    if (continuing) return;
    setContinuing(true);
    const saved = await persist();
    setContinuing(false);
    if (saved) router.push(`/app/projects/${project.id}`);
  }

  async function generateIdeas({ refine = false } = {}) {
    if (!project || suggestBusy) return;
    if (!topic.trim()) {
      setSuggestError('Add a topic first so the model has something to work with.');
      return;
    }
    setSuggestBusy(true);
    setSuggestError('');
    try {
      const data = await suggestIdeas(project.id, {
        topic: topic.trim(),
        audience,
        notes,
        feedback: refine ? feedback.trim() : '',
        previousSuggestions: refine ? suggestions : [],
      });
      const next = data.suggestions || [];
      setSuggestions(next);
      setSuggestSource(topic.trim());
      if (next.length) saveIdeaSuggestions(project.id, { suggestions: next, sourceTopic: topic.trim() });
      setExpanded(new Set());
      if (refine) setFeedback('');
      setNotice(refine ? 'Suggestions refined. Review the new directions.' : 'Ideas ready. Choose one or ask for a change.');
    } catch (error) {
      setSuggestError(suggestionErrorMessage(error.message));
    } finally {
      setSuggestBusy(false);
    }
  }

  function useIdea(suggestion) {
    const title = suggestion.title.replace(/[.!?]+$/, '').trim();
    const nextTopic = `${title}. ${suggestion.angle}`.slice(0, TOPIC_LIMIT);
    setTopic(nextTopic);
    setNotice('Idea applied. Review it, then continue to storyboard.');
    window.setTimeout(() => {
      document.getElementById('idea-topic')?.focus({ preventScroll: true });
    }, 50);
  }

  function toggleSuggestion(index) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice} sectionLabel="Idea">
        <div className="h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419] sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice} sectionLabel="Idea">
        <section className="rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">folder_off</span>
          </span>
          <h1 className="mt-4 font-landing text-2xl font-bold tracking-[-0.04em] text-[#F5F5F7]">Project not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#9A9AA5]">
            {loadError || 'This project was not found, or your account does not have access to it.'}
          </p>
          <Link
            href="/app/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[14px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to Studio Projects
          </Link>
        </section>
      </StudioShell>
    );
  }

  const selectedVoice = voiceOption(voicePreset);
  const saveLabel = saveStatus === 'saving'
    ? 'Saving…'
    : saveStatus === 'saved'
      ? 'Saved'
      : saveStatus === 'conflict'
        ? 'Needs reload'
        : saveStatus === 'error'
          ? 'Save failed'
          : 'Not saved yet';
  const saveTone = saveStatus === 'saved'
    ? 'text-[#6EE7B7]'
    : saveStatus === 'error' || saveStatus === 'conflict'
      ? 'text-[#FCA5A5]'
      : 'text-[#FBBF24]';
  const saveDot = saveStatus === 'saved' ? 'bg-[#34D399]' : saveStatus === 'error' || saveStatus === 'conflict' ? 'bg-[#F87171]' : 'bg-[#FBBF24]';

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice} sectionLabel="Idea">
      <ProjectSteps projectId={project.id} active="idea" />
      <ConflictNotice conflict={conflict} onReload={reloadConflict} onKeep={keepMineOverConflict} busy={conflictBusy} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-2xl font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] text-balance sm:text-[36px]">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[12px] uppercase tracking-[0.14em]">
            <span className={`inline-flex items-center gap-1.5 ${saveTone}`} aria-live="polite">
              <span className={`h-1.5 w-1.5 rounded-full ${saveDot}`} aria-hidden="true" />
              {saveLabel}
            </span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{project.format || 'Talking Head / Explainer'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[14px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to home
          </Link>
          <button
            type="button"
            onClick={continueToStoryboard}
            disabled={!topic.trim() || continuing}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#7C3AED] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {continuing ? 'Saving…' : 'Continue to storyboard'}
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="studio-surface rounded-3xl border border-[#2B2B35] bg-[#141419] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C4B5FD]">The idea</p>
                <h2 className="mt-1 font-landing text-2xl font-bold tracking-[-0.035em] text-[#F5F5F7]">Define the core premise</h2>
                <p className="mt-1 text-[14px] leading-6 text-[#9A9AA5]">Start with the point. The storyboard breaks it into scenes later.</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#26262E] bg-[#0B0B0F] px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.1em] ${saveTone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${saveDot}`} aria-hidden="true" />
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'conflict' ? 'Reload' : saveStatus === 'error' ? 'Error' : 'Draft'}
              </span>
            </div>

            <div className="mt-5">
              <FieldLabel htmlFor="idea-topic" count={<CharacterCount value={topic} max={TOPIC_LIMIT} />}>
                Core topic or premise
              </FieldLabel>
              <textarea
                id="idea-topic"
                rows={6}
                maxLength={TOPIC_LIMIT}
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setSuggestError('');
                }}
                placeholder="Explain RAM versus storage to beginners using a desk and filing cabinet analogy."
                className="mt-2 block w-full resize-y rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-4 py-3 text-[15px] leading-7 text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
              <p className="mt-2 text-[13px] leading-5 text-[#8A8A96]">
                A specific topic, a rough note or a question all work. You decide what becomes the story.
              </p>
            </div>

            <div className="mt-4">
              <FieldLabel htmlFor="idea-audience" count={<CharacterCount value={audience} max={AUDIENCE_LIMIT} />}>
                Target audience
              </FieldLabel>
              <input
                id="idea-audience"
                type="text"
                maxLength={AUDIENCE_LIMIT}
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="e.g. beginner computer users, design directors, solo creators"
                className="mt-2 block w-full rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>

            <div className="mt-4">
              <FieldLabel htmlFor="idea-notes" count={<CharacterCount value={notes} max={NOTES_LIMIT} />}>
                Rough notes &amp; key talking points (optional)
              </FieldLabel>
              <textarea
                id="idea-notes"
                rows={4}
                maxLength={NOTES_LIMIT}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Paste reference notes, facts you want included, or a point of view to keep."
                className="mt-2 block w-full resize-y rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] leading-6 text-[#F5F5F7] outline-none transition placeholder:text-[#5F5F6B] focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>

            <div className="mt-4">
              <FieldLabel htmlFor="idea-voice">Narration voice &amp; delivery tone</FieldLabel>
              <select
                id="idea-voice"
                value={voicePreset}
                onChange={(event) => setVoicePreset(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#2B2B35] bg-[#0E0E13] px-3.5 py-2.5 text-[14px] font-medium text-[#F5F5F7] outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              >
                {VOICE_OPTIONS.map((voice) => (
                  <option key={voice.id} value={voice.id}>{voice.label}</option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#26262E] bg-[#0B0B0F] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#9A9AA5]">
                  {selectedVoice.status === 'test' ? 'Test voice' : 'Unverified'}
                </span>
                <span className="text-[13px] leading-5 text-[#8A8A96]">{selectedVoice.detail}</span>
              </div>
              <p className="mt-1 text-[13px] leading-5 text-[#8A8A96]">
                Selecting a voice saves your choice. It does not generate speech or guarantee synthesis access.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#26262E] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-5 text-[#8A8A96]">
                Changes save automatically. Keep this tab open until your changes are saved.
              </p>
              <button
                type="button"
                onClick={() => persist({ announce: true })}
                disabled={!topic.trim() || saveStatus === 'saving'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2B2B35] bg-[#141419] px-3 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">save</span>
                Save now
              </button>
            </div>
          </section>

          <ReferenceMedia projectId={project.id} />

          <section className="studio-surface rounded-3xl border border-[#2B2B35] bg-[#141419] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#777781]">Workflow discipline</p>
            <h2 className="mt-2 font-landing text-base font-semibold tracking-[-0.02em] text-[#F5F5F7]">Review before render</h2>
            <p className="mt-2 text-[14px] leading-5 text-[#9A9AA5]">
              Next, Vydrivo breaks this premise into scene cards with visual descriptions, narration and timing. Nothing renders until you approve each beat.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#26262E] bg-[#0B0B0F] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#9A9AA5]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" aria-hidden="true" />
              02 Storyboard beats · next
            </span>
          </section>

        </div>

        <aside className="space-y-4">
          <section className="studio-surface rounded-3xl border border-[#2F2F3A] bg-[#17171E] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-landing text-2xl font-bold tracking-[-0.04em] text-[#F5F5F7]">Idea directions</h2>
                  {suggestions.length ? (
                    <span className="rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/15 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#C4B5FD]">
                      {suggestions.length} {suggestions.length === 1 ? 'angle' : 'angles'}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[14px] leading-6 text-[#B4B4C0]">
                  Pick one to shape your brief, or ask for another set.
                </p>
              </div>
              <button
                type="button"
                onClick={() => generateIdeas()}
                disabled={!topic.trim() || suggestBusy}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#3B3B47] bg-[#141419] px-3 py-2 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">auto_awesome</span>
                {suggestBusy ? 'Drafting…' : suggestions.length ? 'Suggest again' : 'Suggest ideas'}
              </button>
            </div>

            {suggestError ? (
              <div role="alert" className="mt-4 rounded-xl border border-[#F87171]/35 bg-[#F87171]/10 p-3.5">
                <p className="text-[13px] font-semibold text-[#FCA5A5]">Couldn&apos;t create directions</p>
                <p className="mt-1 text-[13px] leading-5 text-[#FCA5A5]/80">{suggestError}</p>
                <button
                  type="button"
                  onClick={() => generateIdeas()}
                  disabled={!topic.trim() || suggestBusy}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#F87171]/40 bg-[#141419] px-3 py-1.5 text-[12px] font-semibold text-[#FCA5A5] transition hover:bg-[#1B1B22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                  Try again
                </button>
              </div>
            ) : null}

            {suggestBusy ? (
              <div className="mt-4 rounded-xl border border-[#34343F] bg-[#1B1B22] p-3.5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#C4B5FD]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B5CF6]" aria-hidden="true" />
                  Drafting directions…
                </p>
                <div className="mt-3 space-y-2" aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="rounded-lg border border-[#34343F] bg-[#141419] p-3">
                      <div className="h-2 w-2/3 animate-pulse rounded bg-[#3B3B47]" />
                      <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-[#2B2B35]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!suggestBusy && suggestions.length ? (
              <div className="mt-4 space-y-3">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={`${suggestion.title}-${index}`}
                    suggestion={suggestion}
                    index={index}
                    expanded={expanded.has(index)}
                    onToggle={() => toggleSuggestion(index)}
                    onUse={() => useIdea(suggestion)}
                  />
                ))}
                {suggestSource && suggestSource !== topic.trim() ? (
                  <p className="rounded-lg border border-[#FBBF24]/25 bg-[#FBBF24]/5 px-3 py-2 text-[12px] leading-5 text-[#D6C48A]">
                    These directions came from your earlier brief. Suggest again to refresh them for this topic.
                  </p>
                ) : null}
                <div className="rounded-xl border border-[#34343F] bg-[#141419] p-3">
                  <label htmlFor="idea-feedback" className="text-[13px] font-semibold text-[#C9C9D4]">Not quite right?</label>
                  <textarea
                    id="idea-feedback"
                    rows={2}
                    maxLength={FEEDBACK_LIMIT}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="e.g. Make it more beginner-friendly and use a kitchen analogy."
                    className="mt-1.5 block w-full resize-y rounded-lg border border-[#34343F] bg-[#1B1B22] px-3 py-2 text-[14px] leading-5 text-[#F5F5F7] outline-none transition placeholder:text-[#6B6B78] focus:border-[#8B5CF6]"
                  />
                  <button
                    type="button"
                    onClick={() => generateIdeas({ refine: true })}
                    disabled={!feedback.trim() || suggestBusy}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#3B3B47] bg-[#1B1B22] px-3 py-2 text-[13px] font-semibold text-[#C9C9D4] transition hover:border-[#8B5CF6]/50 hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                    Refine suggestions
                  </button>
                </div>
              </div>
            ) : null}

            {!suggestBusy && !suggestions.length && !suggestError ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#34343F] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.14),transparent_70%)] px-4 py-8 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#C4B5FD]">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">lightbulb</span>
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[#F5F5F7]">No directions yet</p>
                <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-6 text-[#A6A6B2]">
                  Add a topic, then select <span className="font-semibold text-[#C4B5FD]">Suggest ideas</span> to get three angles.
                </p>
              </div>
            ) : null}

            <p className="mt-3 text-[12px] leading-5 text-[#8A8A96]">
              AI suggestions may be inaccurate. Review the facts, wording and visual direction before continuing.
            </p>
          </section>

          <section className="studio-surface rounded-3xl border border-[#2B2B35] bg-[#141419] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#777781]">Project brief</p>
              <span className="rounded-full border border-[#34D399]/35 bg-[#34D399]/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#6EE7B7]">
                Current
              </span>
            </div>
            <div className="mt-3">
              <BriefRow label="Format" value={project.format || 'Talking Head / Explainer'} />
              <BriefRow label="Target duration" value={project.targetLabel || '60–90s'} />
              <BriefRow label="Aspect ratio" value={project.aspect || '9:16'} />
              <BriefRow label="Narration" value={selectedVoice.label} />
            </div>
          </section>

        </aside>
      </div>
    </StudioShell>
  );
}
