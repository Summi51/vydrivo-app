'use client';

import Link from 'next/link';
import { useId } from 'react';

const SIZES = {
  sm: { mark: 32, name: 'text-[17px]', subtitle: 'text-[11px]' },
  md: { mark: 40, name: 'text-xl', subtitle: 'text-[12px]' },
  lg: { mark: 48, name: 'text-[26px]', subtitle: 'text-[13px]' },
};

// Concept A "Ribbon V" from the 28 October logo review: two gradient ribbons
// meeting in a V, which reads as the letter, a play cut and a storyboard beat.
// One shared mark for the landing, auth screens and studio shell.
export function LogoMark({ size = 'md', className = '' }) {
  const scale = SIZES[size] || SIZES.md;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const leftId = `vydrivo-ribbon-left-${uid}`;
  const rightId = `vydrivo-ribbon-right-${uid}`;
  return (
    <span
      className={`inline-grid shrink-0 place-items-center drop-shadow-[0_6px_18px_rgba(139,92,246,0.35)] ${className}`}
      style={{ width: scale.mark, height: scale.mark }}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={leftId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#C4B5FD" />
            <stop offset="0.42" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#2DD4BF" />
          </linearGradient>
          <linearGradient id={rightId} x1="56" y1="8" x2="8" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2DD4BF" />
            <stop offset="0.55" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#C4B5FD" />
          </linearGradient>
        </defs>
        <path d="M15 13.5 29.6 49" fill="none" stroke={`url(#${leftId})`} strokeWidth="9.5" strokeLinecap="round" />
        <path d="M49 13.5 34.4 49" fill="none" stroke={`url(#${rightId})`} strokeWidth="9.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function BrandLockup({
  href = '/',
  size = 'md',
  subtitle = '',
  showName = true,
  className = '',
  nameClassName = '',
  ariaLabel = 'Vydrivo home',
}) {
  const scale = SIZES[size] || SIZES.md;
  const content = (
    <>
      <LogoMark size={size} />
      {showName ? (
        <span className="flex min-w-0 flex-col">
          <span className={`font-landing font-bold leading-none tracking-[-0.045em] text-[#F5F5F7] ${scale.name} ${nameClassName}`}>
            Vydrivo
          </span>
          {subtitle ? (
            <span className={`mt-1.5 font-mono font-semibold uppercase leading-none tracking-[0.22em] text-[#9A9AA5] ${scale.subtitle}`}>
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return <span className={`inline-flex items-center gap-2.5 ${className}`}>{content}</span>;
  }

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F] ${className}`}
      aria-label={ariaLabel}
    >
      {content}
    </Link>
  );
}
