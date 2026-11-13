'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BrandLockup from '../components/BrandLockup';
import BackgroundPlaylist from '../components/landing/BackgroundPlaylist';
import IdeaStartForm from '../components/landing/IdeaStartForm';
import { mediaUrl } from '../lib/media.js';

const HERO_SOURCES = [
  mediaUrl('hero-ai-lab.mp4'),
  mediaUrl('hero-education-desk.mp4'),
  mediaUrl('hero-lyrical.mp4'),
  mediaUrl('auth-reel-orb.mp4'),
  mediaUrl('auth-reel-space.mp4'),
  mediaUrl('auth-reel-art.mp4'),
];

const STEPS = [
  {
    icon: 'edit_note',
    label: 'Step 01',
    title: 'Describe your idea',
    body: 'Type a premise, lesson, or rough notes. Vydrivo shapes the story around the point you want to make.',
    tag: 'Start with a topic',
  },
  {
    icon: 'dashboard_customize',
    label: 'Step 02',
    title: 'Review the storyboard',
    body: 'Check pacing, visuals, and narration before rendering. Change any scene before it renders.',
    tag: 'Approve the plan',
  },
  {
    icon: 'movie',
    label: 'Step 03',
    title: 'Render and export',
    body: 'Render the approved storyboard with diagrams, Hindi voice and Hinglish captions, then export a 60–90 second vertical MP4.',
    tag: '1080 × 1920 · 30 fps',
  },
];

const FEATURES = [
  {
    icon: 'lightbulb',
    title: 'AI idea suggestions',
    body: 'Rapid concept prompts and hook generation help you find the strongest angle before you commit.',
  },
  {
    icon: 'dashboard_customize',
    title: 'Scene-by-scene review',
    body: 'Edit narration, visual intent, and timing before a single frame is rendered.',
  },
  {
    icon: 'edit_note',
    title: 'Scene text editor',
    body: 'Edit the Hinglish title, labels and captions, and the Hindi voice narration before rendering.',
  },
  {
    icon: 'movie',
    title: 'Free graphics video',
    body: 'Render diagrams, Hinglish screen text and Hindi voice into a vertical MP4 without a paid video provider.',
  },
  {
    icon: 'subtitles',
    title: 'Hindi voice + Hinglish captions',
    body: 'Pick a male or female Hindi voice; captions stay readable in Hinglish with the current phrase highlighted.',
  },
  {
    icon: 'download',
    title: 'MP4 export',
    body: 'Export a 1080 × 1920 MP4 ready for Shorts, Reels, and TikTok.',
  },
];

const EXAMPLES = [
  {
    id: 'education',
    label: 'Education',
    title: 'How a neural network learns',
    duration: '1:15',
    tags: 'Explainer · 4 scenes',
    video: mediaUrl('example-education.mp4'),
    poster: mediaUrl('example-education-poster.jpg'),
    accent: 'from-[#2E1065] via-[#4C1D95] to-[#0B0B0F]',
  },
  {
    id: 'product',
    label: 'Product',
    title: 'Visualising a recommendation engine',
    duration: '1:12',
    tags: 'Product · 3 scenes',
    video: mediaUrl('example-product.mp4'),
    poster: mediaUrl('example-product-poster.jpg'),
    accent: 'from-[#3B1D0B] via-[#7C2D12] to-[#0B0B0F]',
  },
  {
    id: 'social',
    label: 'Social',
    title: 'The binary code behind your feed',
    duration: '1:20',
    tags: 'Algorithms · 5 scenes',
    video: mediaUrl('example-social.mp4'),
    poster: mediaUrl('example-social-poster.jpg'),
    accent: 'from-[#052E2B] via-[#115E59] to-[#0B0B0F]',
  },
  {
    id: 'data-pipeline',
    label: 'Education',
    title: 'How data moves through AI',
    duration: '1:10',
    tags: 'Data · 4 scenes',
    video: mediaUrl('example-data-pipeline.mp4'),
    poster: mediaUrl('example-data-pipeline-poster.jpg'),
    accent: 'from-[#0B1E3A] via-[#1D4ED8] to-[#0B0B0F]',
  },
  {
    id: 'ai-map',
    label: 'Product',
    title: 'Visualising an AI model',
    duration: '1:05',
    tags: 'Model · 3 scenes',
    video: mediaUrl('example-ai-map.mp4'),
    poster: mediaUrl('example-ai-map-poster.jpg'),
    accent: 'from-[#0B2E2B] via-[#0F766E] to-[#0B0B0F]',
  },
  {
    id: 'future-city',
    label: 'Social',
    title: 'The future of AI in cities',
    duration: '1:20',
    tags: 'Future · 5 scenes',
    video: mediaUrl('example-future-city.mp4'),
    poster: mediaUrl('example-future-city-poster.jpg'),
    accent: 'from-[#2E1065] via-[#7C3AED] to-[#0B0B0F]',
  },
];

function Brand({ compact = false }) {
  return <BrandLockup href="/" size={compact ? 'sm' : 'md'} />;
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#26262E]/80 bg-[#0B0B0F]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm text-[#9A9AA5] md:flex" aria-label="Main navigation">
          <a className="transition hover:text-[#F5F5F7]" href="#how-it-works">How it works</a>
          <a className="transition hover:text-[#F5F5F7]" href="#demo">Demo</a>
          <a className="transition hover:text-[#F5F5F7]" href="#examples">Examples</a>
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            className="hidden whitespace-nowrap text-sm text-[#9A9AA5] transition hover:text-[#F5F5F7] md:inline fost"
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#7C3AED] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
          >
            Start creating
          </Link>
          <details className="relative md:hidden">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-xl border border-[#2B2B35] text-[#9A9AA5] [&::-webkit-details-marker]:hidden" aria-label="Open menu">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">menu</span>
            </summary>
            <div className="absolute right-0 top-11 w-44 rounded-xl border border-[#2B2B35] bg-[#141419] p-1.5 shadow-2xl">
              <a className="block rounded-lg px-3 py-2 text-xs text-[#D4D4D8] hover:bg-[#1B1B22]" href="#how-it-works">How it works</a>
              <a className="block rounded-lg px-3 py-2 text-xs text-[#D4D4D8] hover:bg-[#1B1B22]" href="#demo">Demo</a>
              <a className="block rounded-lg px-3 py-2 text-xs text-[#D4D4D8] hover:bg-[#1B1B22]" href="#examples">Examples</a>
              <Link className="block rounded-lg px-3 py-2 text-xs text-[#D4D4D8] hover:bg-[#1B1B22]" href="/sign-in">Sign in</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function StoryboardCard() {
  return (
    <div className="hero-explainer-card relative mx-auto w-full lg:ml-auto">
      <div className="absolute -inset-6 rounded-[42px] bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.28),transparent_65%)] blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,#1A1424_0%,#0F0F14_45%,#0B0B0F_100%)] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="inline-flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B5CF6] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B5CF6]" />
            </span>
            Education explainer
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777781]">7s</span>
        </div>

        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0B0B0F]">
          <div className="relative aspect-[9/16]">
            <video
              src="/videos/hero-load-balancing.mp4?v=1"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="flex justify-end px-1 pt-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-[#0B0B0F] transition hover:bg-[#C4B5FD]"
          >
            Open storyboard
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ExampleCard({ example, onPlay }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(example)}
      className="group overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419] text-left transition hover:border-[#8B5CF6]/45 hover:shadow-[0_18px_50px_rgba(0,0,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
    >
      <div className="relative h-[340px] overflow-hidden bg-[#0B0B0F]">
        <div className={`absolute inset-0 bg-gradient-to-br ${example.accent}`} />
        <img
          src={example.poster}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <video
          src={example.video}
          poster={example.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80 motion-reduce:hidden"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,15,0.08)_0%,rgba(11,11,15,0.18)_45%,rgba(11,11,15,0.90)_100%)]" />
        <div className="absolute inset-0 opacity-[0.1] [background-image:radial-gradient(rgba(255,255,255,0.85)_0.8px,transparent_0.8px)] [background-size:18px_18px]" />
        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/75 backdrop-blur">
          {example.label}
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 px-2 py-1 font-mono text-[8px] text-white/75 backdrop-blur">
          {example.duration}
        </span>
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur transition group-hover:bg-[#8B5CF6]">
          <span className="material-symbols-outlined text-[26px]" aria-hidden="true">play_arrow</span>
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-landing text-base font-semibold leading-5 text-white">{example.title}</p>
          <p className="mt-1 text-[10px] text-white/55">{example.tags}</p>
        </div>
      </div>
    </button>
  );
}

function VideoModal({ example, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={example.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur hover:bg-white/20"
        >
          Close
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
        </button>
        <video
          src={example.video}
          poster={example.poster}
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
          className="mx-auto block max-h-[78vh] max-w-full rounded-2xl border border-[#2B2B35] bg-black object-contain"
        />
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#9A9AA5]">
          <span>{example.title}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            {example.label}{example.id === 'product-demo' ? '' : ' · Sample'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeDemo, setActiveDemo] = useState(null);

  return (
    <div className="vydrivo-landing min-h-screen bg-[#0B0B0F] font-landing text-[#F5F5F7] selection:bg-[#8B5CF6] selection:text-white">
      <Nav />
      <main>
        <section className="relative isolate overflow-hidden border-b border-[#26262E]" id="start">
          <BackgroundPlaylist sources={HERO_SOURCES} poster={mediaUrl('hero-playlist-poster.jpg')} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,15,0.92)_0%,rgba(11,11,15,0.72)_40%,rgba(11,11,15,0.20)_68%,rgba(11,11,15,0.55)_100%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,15,0.70)_0%,rgba(11,11,15,0.18)_38%,rgba(11,11,15,0.50)_100%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_32%,rgba(11,11,15,0.46)_100%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[#8B5CF6]/5 mix-blend-soft-light" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid min-h-[720px] max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4B5FD]">Idea → Storyboard → Video</p>
              <h1 className="mt-4 max-w-2xl font-landing text-4xl font-bold leading-[1.02] tracking-[-0.055em] text-white sm:text-5xl lg:text-[64px]">
                Turn an idea into a video.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#B4B4BE] sm:text-base">
                Review the storyboard, render a free graphics video with Hindi voice and Hinglish screen text, and export a 60–90 second vertical MP4.
              </p>
              <IdeaStartForm id="landing-topic-hero" />
              <a
                href="#demo"
                className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-[#C4B5FD] transition hover:text-white"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/5">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">play_arrow</span>
                </span>
                Watch how it works
              </a>
            </div>
            <div className="relative">
              <div className="absolute -inset-10 rounded-[44px] bg-[radial-gradient(circle,rgba(11,11,15,0.72),transparent_70%)] blur-2xl" aria-hidden="true" />
              <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.18),transparent_65%)] blur-2xl" aria-hidden="true" />
              <StoryboardCard />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">Simple process</p>
            <h2 className="mt-3 font-landing text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">Three steps from spark to finished cut.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#9A9AA5]">
              Write the idea, review the plan, and generate only after the storyboard is approved.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <article key={step.label} className="rounded-2xl border border-[#26262E] bg-[#141419] p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1B1B22] text-[#C4B5FD] ring-1 ring-[#2B2B35]">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{step.icon}</span>
                  </span>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#777781]">{step.label}</span>
                </div>
                <h3 className="mt-5 font-landing text-lg font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#9A9AA5]">{step.body}</p>
                <span className="mt-4 inline-flex rounded-full border border-[#2B2B35] bg-[#0F0F14] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#A1A1AA]">{step.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="demo" className="border-y border-[#26262E] bg-[#0E0E13]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div className="max-w-xl">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">See it in action</p>
                <h2 className="mt-3 font-landing text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">Watch how Vydrivo works.</h2>
                <p className="mt-3 text-sm leading-6 text-[#9A9AA5]">
                  A 30-second walkthrough from idea to reviewed storyboard, free graphics video and a vertical MP4.
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-6 text-[#B4B4BE]">
                  <li className="flex gap-2"><span className="text-[#8B5CF6]" aria-hidden="true">✓</span> Start with one idea and review the generated storyboard.</li>
                  <li className="flex gap-2"><span className="text-[#8B5CF6]" aria-hidden="true">✓</span> Change a scene without rebuilding the whole project.</li>
                  <li className="flex gap-2"><span className="text-[#8B5CF6]" aria-hidden="true">✓</span> Export the approved version as a vertical MP4.</li>
                </ul>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#2B2B35] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster={mediaUrl('vydrivo-demo-poster.jpg')}
                  aria-label="How Vydrivo works"
                  className="aspect-video w-full"
                >
                  <source src={mediaUrl('vydrivo-demo.mp4')} type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>

        <section id="examples" className="border-y border-[#26262E] bg-[#0E0E13]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">Example stories</p>
                <h2 className="mt-3 font-landing text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">Built for real explanations.</h2>
                <p className="mt-3 text-sm leading-6 text-[#9A9AA5]">
                  Explore 60–90 second explainers drafted and exported directly with Vydrivo.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[#2B2B35] bg-[#141419] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#777781]">
                Sample concepts
              </span>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {EXAMPLES.map((example) => (
                <ExampleCard key={example.id} example={example} onPlay={setActiveDemo} />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">Production suite</p>
            <h2 className="mt-3 font-landing text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">Everything you need.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#9A9AA5]">
              A focused toolset for short-form visual stories, from the first prompt to the final export.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-[#26262E] bg-[#141419] p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1B1B22] text-[#C4B5FD] ring-1 ring-[#2B2B35]">
                  <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{feature.icon}</span>
                </span>
                <h3 className="mt-4 font-landing text-sm font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#9A9AA5]">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ready" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-[#2B2B35] bg-[#141419] px-6 py-12 text-center sm:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.22),transparent_58%)]" aria-hidden="true" />
            <div className="relative">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">Ready to produce</p>
              <h2 className="mx-auto mt-3 max-w-2xl font-landing text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">Your next video starts with one idea.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#9A9AA5]">
                Draft a storyboard in seconds. No complex timeline editing required.
              </p>
              <IdeaStartForm variant="footer" id="landing-topic-footer" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#26262E]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand compact />
          <nav className="flex flex-wrap items-center gap-5 text-xs text-[#9A9AA5]" aria-label="Footer navigation">
            <a className="hover:text-[#F5F5F7]" href="#how-it-works">How it works</a>
            <a className="hover:text-[#F5F5F7]" href="#demo">Demo</a>
            <a className="hover:text-[#F5F5F7]" href="#examples">Examples</a>
            <Link className="hover:text-[#F5F5F7]" href="/sign-in">Sign in</Link>
          </nav>
          <p className="text-xs text-[#777781]">© 2026 Vydrivo. All rights reserved.</p>
        </div>
      </footer>

      {activeDemo ? <VideoModal example={activeDemo} onClose={() => setActiveDemo(null)} /> : null}
    </div>
  );
}
