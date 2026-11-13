'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import BrandLockup from '../BrandLockup';
import SignOutButton from '../SignOutButton';

const STAGES = [
  { id: 'idea', label: 'Idea notes' },
  { id: 'storyboard', label: 'Storyboard beats' },
  { id: 'video', label: 'Video & export' },
];

function NavItem({ icon, label, active = false, href, onClick, disabled = false, title, badge }) {
  const base =
    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50';
  const tone = active
    ? 'bg-[#1B1B22] text-[#F5F5F7] ring-1 ring-[#8B5CF6]/30'
    : 'text-[#9A9AA5] hover:bg-white/[0.04] hover:text-[#F5F5F7]';
  const disabledTone = 'cursor-not-allowed text-[#5F5F6B]';
  const className = `${base} ${disabled ? disabledTone : tone}`;
  const iconNode = (
    <span
      className={`material-symbols-outlined text-[19px] ${active ? 'text-[#C4B5FD]' : 'text-[#777781] group-hover:text-[#C4B5FD]'}`}
      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
  const badgeNode =
    badge !== undefined && badge !== null ? (
      <span className="ml-auto rounded-full border border-[#2B2B35] bg-[#0B0B0F] px-2 py-0.5 font-mono text-[12px] tabular-nums text-[#9A9AA5]">
        {badge}
      </span>
    ) : null;

  if (href && !disabled) {
    return (
      <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
        {iconNode}
        <span>{label}</span>
        {badgeNode}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title || (disabled ? `${label} is not connected in this build` : label)}
      aria-label={title || label}
    >
      {iconNode}
      <span>{label}</span>
      {disabled ? (
        <span className="material-symbols-outlined ml-auto text-[14px] text-[#4A4A55]" aria-hidden="true">
          lock
        </span>
      ) : (
        badgeNode
      )}
    </button>
  );
}

function StageList({ stage = 0, storyboardApproved = true }) {
  return (
    <div className="mt-8 border-t border-[#26262E] pt-5">
      <p className="px-3 font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#777781]">Workflow stages</p>
      <ol className="mt-3 space-y-2.5 px-3">
        {STAGES.map((item, index) => {
          const done = index < stage && (item.id !== 'storyboard' || storyboardApproved);
          const current = index === stage;
          return (
            <li key={item.label} className="flex items-center gap-2.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  done ? 'bg-[#34D399]' : current ? 'bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.8)]' : 'bg-[#3A3A45]'
                }`}
                aria-hidden="true"
              />
              <span className="font-mono text-[12px] tabular-nums text-[#5F5F6B]">{String(index + 1).padStart(2, '0')}</span>
              <span className={`text-[14px] ${current ? 'font-semibold text-[#F5F5F7]' : done ? 'text-[#9A9AA5]' : 'text-[#777781]'}`}>
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    loading: { label: 'Connecting', dot: 'bg-[#FBBF24]' },
    ready: { label: 'Studio ready', dot: 'bg-[#34D399]' },
    error: { label: 'Offline', dot: 'bg-[#F87171]' },
  };
  const state = map[status] || map.loading;
  return (
    <span
      className="hidden items-center gap-2 rounded-full border border-[#26262E] bg-[#141419] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-[#9A9AA5] sm:inline-flex"
      title="Your projects and storyboards are saved to your studio."
    >
      <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} aria-hidden="true" />
      {state.label}
    </span>
  );
}

export default function StudioShell({ user, onNew, onNotice, notice, status = null, projectCount, stage = 0, storyboardApproved = true, sectionLabel, purpleAmbient = false, children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const activeSection = mounted
    ? pathname?.startsWith('/app/projects')
      ? 'projects'
      : pathname?.startsWith('/app/videos')
        ? 'videos'
        : pathname === '/app'
          ? 'home'
          : ''
    : '';
  const section = sectionLabel || (activeSection === 'projects' ? 'Projects' : activeSection === 'videos' ? 'Videos' : 'Home');

  return (
    <div className={`vydrivo-studio min-h-screen text-[#F5F5F7] selection:bg-[#8B5CF6] selection:text-white${purpleAmbient ? ' studio-purple-page' : ''}`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-[#26262E] bg-[linear-gradient(180deg,#101015_0%,#0C0C11_100%)] px-4 py-5 lg:flex">
        <div className="px-2">
          <BrandLockup href="/app" size="md" subtitle="Creator Studio" ariaLabel="Vydrivo Creator Studio home" />
        </div>

        <button
          type="button"
          onClick={onNew}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            add
          </span>
          New project
        </button>

        <nav aria-label="Studio navigation" className="mt-6 flex flex-col gap-1">
          <NavItem icon="home" label="Home" href="/app" active={activeSection === 'home'} />
          <NavItem icon="video_library" label="Projects" href="/app/projects" active={activeSection === 'projects'} badge={projectCount} />
          <NavItem icon="movie" label="Videos" href="/app/videos" active={activeSection === 'videos'} />
          <NavItem icon="calendar_month" label="Posts" disabled title="Publishing is not connected yet" />
        </nav>

        <StageList stage={stage} storyboardApproved={storyboardApproved} />

        <div className="mt-auto border-t border-[#26262E] pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#26262E] bg-[#141419] p-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#2DD4BF] text-xs font-bold text-[#0B0B0F]"
              title={user.displayName}
            >
              {user.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#F5F5F7]">{user.displayName}</p>
              <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#777781]">Creator</p>
            </div>
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-[#26262E]/80 bg-[#0B0B0F]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <BrandLockup href="/app" size="sm" ariaLabel="Vydrivo Creator Studio home" />
              </div>
              <p className="hidden items-center gap-1.5 font-mono text-[13px] uppercase tracking-[0.18em] text-[#777781] lg:flex">
                Creator Studio
                <span className="text-[#3F3F4A]" aria-hidden="true">/</span>
                <span className="text-[#C4B5FD]">{section}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {status ? <StatusChip status={status} /> : null}
              <button
                type="button"
                onClick={onNew}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3.5 py-2 text-[14px] font-semibold text-[#C4B5FD] transition hover:border-[#8B5CF6]/70 hover:bg-[#8B5CF6]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60 lg:hidden"
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
                New
              </button>
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#2DD4BF] text-xs font-bold text-[#0B0B0F] ring-2 ring-[#0B0B0F] outline outline-1 outline-[#26262E]"
                title={user.displayName}
              >
                {user.initial}
              </span>
              <div className="lg:hidden">
                <SignOutButton compact />
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-[#26262E]/70 px-4 py-2 lg:hidden">
            {[
              ['Home', '/app'],
              ['Projects', '/app/projects'],
              ['Videos', '/app/videos'],
              ['New', '/app#create-video'],
            ].map(([label, href]) => {
              const active =
                (href === '/app' && activeSection === 'home')
                || (href === '/app/projects' && activeSection === 'projects')
                || (href === '/app/videos' && activeSection === 'videos');
              return (
                <Link
                  key={label}
                  href={href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-semibold transition ${
                    active
                      ? 'bg-[#8B5CF6]/15 text-[#C4B5FD] ring-1 ring-[#8B5CF6]/40'
                      : 'text-[#9A9AA5] ring-1 ring-[#26262E] hover:text-[#F5F5F7]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          {children}
          <footer className="mt-12 flex flex-col gap-2 border-t border-[#26262E] pt-6 text-[14px] text-[#777781] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Vydrivo. All rights reserved.</p>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#5F5F6B]">Storyboard-first · Review before render</p>
          </footer>
        </main>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {notice ? (
          <div className="pointer-events-auto max-w-md rounded-2xl border border-[#3B2A5A] bg-[#17131F] px-4 py-3 text-center text-[13px] font-medium text-[#EDE9FE] shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            {notice}
          </div>
        ) : null}
      </div>
    </div>
  );
}
