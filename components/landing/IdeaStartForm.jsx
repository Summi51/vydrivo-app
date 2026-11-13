'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PENDING_TOPIC_KEY } from '../../lib/project-draft.js';

const TOPIC_LIMIT = 2000;

export default function IdeaStartForm({ variant = 'hero', id = 'landing-topic' }) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const clean = topic.replace(/\s+/g, ' ').trim();
    if (!clean) {
      setError('Add a topic or a rough note to start.');
      return;
    }
    if (clean.length > TOPIC_LIMIT) {
      setError(`Keep the topic under ${TOPIC_LIMIT.toLocaleString()} characters.`);
      return;
    }

    setError('');
    setBusy(true);
    try {
      window.sessionStorage.setItem(PENDING_TOPIC_KEY, clean);
    } catch {
      setError('This browser could not save your topic. Try again.');
      setBusy(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      router.push(payload?.data?.signedIn ? '/app' : '/sign-in?next=/app');
    } catch {
      router.push('/sign-in?next=/app');
    }
  }

  const footer = variant === 'footer';

  return (
    <form onSubmit={submit} className={footer ? 'mx-auto mt-5 w-full max-w-2xl' : 'mt-6 w-full max-w-xl'}>
      <div
        className={`flex flex-col gap-2 rounded-2xl border border-[#2B2B35] bg-[#141419]/90 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition focus-within:border-[#8B5CF6]/70 focus-within:ring-4 focus-within:ring-[#8B5CF6]/10 sm:flex-row sm:items-center ${
          footer ? 'sm:p-2.5' : ''
        }`}
      >
        <label htmlFor={id} className="sr-only">What do you want to explain?</label>
        <span className="hidden pl-2 text-[#9A9AA5] sm:inline" aria-hidden="true">
          <span className="material-symbols-outlined text-[18px]">lightbulb</span>
        </span>
        <input
          id={id}
          type="text"
          value={topic}
          maxLength={TOPIC_LIMIT}
          onChange={(event) => {
            setTopic(event.target.value);
            setError('');
          }}
          placeholder="What do you want to explain?"
          className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm text-[#F5F5F7] outline-none placeholder:text-[#777781] focus:ring-0"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7C3AED] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F] disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Opening…' : 'Create project & continue'}
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
        </button>
      </div>
      <div className="mt-2 flex min-h-5 items-center gap-2 px-1 text-[11px] leading-5">
        {error ? (
          <p role="alert" className="text-rose-300">{error}</p>
        ) : (
          <p className="text-[#9A9AA5]">
            Start with an idea. Review before you generate.
          </p>
        )}
      </div>
    </form>
  );
}
