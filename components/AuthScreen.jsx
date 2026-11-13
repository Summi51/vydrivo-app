'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandLockup from './BrandLockup';
import { mediaUrl } from '../lib/media.js';

const COPY = {
  'sign-in': {
    tab: 'sign-in',
    eyebrow: 'Welcome back',
    title: 'Sign in to Vydrivo.',
    subtitle: 'Pick up your storyboard, scripts and video projects.',
    endpoint: '/api/v1/auth/sign-in',
    submit: 'Sign in',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    divider: 'or continue with email',
    google: true,
  },
  'sign-up': {
    tab: 'sign-up',
    eyebrow: 'Start creating',
    title: 'Create your account.',
    subtitle: 'Start with a reviewed storyboard. Google or email both work.',
    endpoint: '/api/v1/auth/sign-up',
    submit: 'Create account',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    divider: 'or continue with email',
    google: true,
  },
  recover: {
    tab: 'recover',
    eyebrow: 'Reset access',
    title: 'Reset your password.',
    subtitle: 'Enter the email on your account. We will send a reset link if it exists.',
    endpoint: '/api/v1/auth/recovery',
    submit: 'Send reset link',
    emailLabel: 'Email',
    passwordLabel: '',
    divider: '',
    google: false,
  },
  password: {
    tab: 'recover',
    eyebrow: 'New password',
    title: 'Choose a new password.',
    subtitle: 'Your recovery link is active. Set a new password to finish.',
    endpoint: '/api/v1/auth/password',
    submit: 'Update password',
    emailLabel: '',
    passwordLabel: 'New password',
    divider: '',
    google: false,
  },
};

const TABS = [
  ['sign-in', 'Sign in', '/sign-in'],
  ['sign-up', 'Create account', '/sign-up'],
];

const AUTH_REELS_NEW = [
  { src: mediaUrl('auth-reel-sun.mp4'), poster: mediaUrl('auth-reel-sun-poster.jpg'), label: 'AI footage · Science' },
  { src: mediaUrl('auth-reel-art.mp4'), poster: mediaUrl('auth-reel-art-poster.jpg'), label: 'AI footage · Art' },
  { src: mediaUrl('auth-reel-copy.mp4'), poster: mediaUrl('auth-reel-copy-poster.jpg'), label: 'AI footage · AI' },
  { src: mediaUrl('auth-reel-brand.mp4'), poster: mediaUrl('auth-reel-brand-poster.jpg'), label: 'AI footage · Brand' },
];

const AUTH_REELS = [
  { src: mediaUrl('auth-reel-orb.mp4'), poster: mediaUrl('auth-reel-orb-poster.jpg'), label: 'AI footage · Product' },
  { src: mediaUrl('auth-reel-space.mp4'), poster: mediaUrl('auth-reel-space-poster.jpg'), label: 'AI footage · Education' },
  { src: mediaUrl('auth-reel-robot.mp4'), poster: mediaUrl('auth-reel-robot-poster.jpg'), label: 'AI footage · Character' },
  { src: mediaUrl('auth-reel-face.mp4'), poster: mediaUrl('auth-reel-face-poster.jpg'), label: 'AI footage · Storyboard' },
];

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not start a secure form. Refresh and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function Brand({ compact = false }) {
  return <BrandLockup href="/" size={compact ? 'sm' : 'lg'} />;
}

function BackHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-xl border border-[#2B2B35] bg-[#141419]/75 px-3.5 py-2 text-[11px] font-medium text-[#9A9AA5] transition hover:border-[#8B5CF6]/45 hover:text-white"
    >
      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
      Back to homepage
    </Link>
  );
}


function useDesktopReels() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return desktop;
}

function ReelCard({ reel, index }) {
  return (
    <div
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141419] shadow-[0_18px_50px_rgba(0,0,0,0.4)] ${
        index % 2 === 0 ? '-rotate-[2deg]' : 'rotate-[1.5deg]'
      }`}
    >
      <img src={reel.poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      <video
        src={reel.src}
        poster={reel.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover opacity-90 motion-reduce:hidden"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F]/90 via-transparent to-[#0B0B0F]/20" />
      <span className="absolute inset-x-2 bottom-2 rounded-full border border-white/10 bg-black/35 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] text-white/70 backdrop-blur">
        {reel.label}
      </span>
    </div>
  );
}

function ReelWall() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] overflow-hidden opacity-80" aria-hidden="true">
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,#0B0B0F_0%,rgba(11,11,15,0.75)_14%,rgba(11,11,15,0.22)_34%,rgba(11,11,15,0.06)_60%,rgba(11,11,15,0.02)_100%)]" />
      <div className="relative flex h-full gap-2 px-3 py-4">
        <div className="vydrivo-reel-column flex w-1/2 flex-col gap-2">
          {AUTH_REELS_NEW.map((reel, index) => (
            <ReelCard key={`new-${reel.src}`} reel={reel} index={index} />
          ))}
        </div>
        <div className="vydrivo-reel-column vydrivo-reel-column-slow flex w-1/2 flex-col gap-2">
          {AUTH_REELS.map((reel, index) => (
            <ReelCard key={`existing-${reel.src}`} reel={reel} index={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandPanel({ showReels }) {
  return (
    <aside className="relative hidden min-h-screen flex-col overflow-hidden border-r border-[#26262E] bg-[#0B0B0F] px-10 py-8 lg:flex xl:px-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.12),transparent_36%),radial-gradient(circle_at_76%_74%,rgba(45,212,191,0.06),transparent_34%)]" aria-hidden="true" />
      {showReels ? <ReelWall /> : null}

      <div className="relative z-20 flex items-center justify-between gap-6">
        <Brand />
        <BackHome />
      </div>

      <div
        className="relative z-20 flex flex-1 flex-col justify-center py-12"
        style={{ textShadow: '0 2px 18px rgba(0,0,0,0.65)' }}
      >
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" aria-hidden="true" />
          A wall of ideas in motion
        </span>
        <h2 className="mt-5 max-w-[430px] font-landing text-[48px] font-bold leading-[1.02] tracking-[-0.055em] text-white xl:text-[56px]">
          Turn your idea into a video <span className="text-[#9A9AA5]">you can shape.</span>
        </h2>
        <p className="mt-5 max-w-[430px] text-sm leading-7 text-[#B4B4BE]">
          Review the storyboard before anything renders. Then generate footage, narration and captions.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {['Education', 'Product', 'Social', 'Storyboards'].map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 backdrop-blur">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-20 flex items-center justify-between gap-4 font-mono text-[10px] tracking-[0.12em] text-[#9A9AA5]">
        <span>© 2026 Vydrivo</span>
        <span className="hidden xl:inline">Sample AI footage</span>
      </div>
    </aside>
  );
}

function AuthTabs({ active }) {
  return (
    <div className="flex w-full items-stretch gap-8 border-b border-[#26262E]" role="tablist" aria-label="Authentication">
      {TABS.map(([id, label, href]) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`relative flex-1 pb-4 text-center text-sm font-medium transition ${
              isActive ? 'text-white' : 'text-[#9A9AA5] hover:text-white'
            }`}
          >
            {label}
            {isActive ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#8B5CF6]" /> : null}
          </Link>
        );
      })}
    </div>
  );
}

function Field({ id, label, type = 'text', value, onChange, autoComplete, placeholder, fieldTrailing }) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-[12px] font-medium text-[#E4E4E7]">{label}</span>
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-3.5 transition focus-within:border-[#8B5CF6]/70 focus-within:ring-4 focus-within:ring-[#8B5CF6]/10">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[16px] text-[#F5F5F7] outline-none ring-0 placeholder:text-[#9A9AA5] focus:border-0 focus:outline-none focus:ring-0 sm:text-[15px]"
        />
        {fieldTrailing}
      </span>
    </label>
  );
}

function Message({ tone, children }) {
  const styles =
    tone === 'error'
      ? 'border-rose-400/25 bg-rose-400/10 text-rose-200'
      : tone === 'ok'
        ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
        : 'border-amber-400/25 bg-amber-400/10 text-amber-200';
  return (
    <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${styles}`}>
      {children}
    </p>
  );
}

export default function AuthScreen({ mode = 'sign-in', config = { configured: false, googleConfigured: false }, notice = '', noticeTone = 'warn' }) {
  const router = useRouter();
  const copy = COPY[mode] || COPY['sign-in'];
  const showReels = useDesktopReels();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState(notice);
  const [tone, setTone] = useState(noticeTone);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!copy.endpoint) return;
    setBusy(true);
    setMessage('');
    try {
      const token = await csrfToken();
      const body =
        mode === 'recover'
          ? { email }
          : mode === 'password'
            ? { newPassword: password }
            : mode === 'sign-up'
              ? { email, password }
              : { email, password, remember };
      const response = await fetch(copy.endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(body),
      });
      const payload = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        setTone('error');
        setMessage(payload.error?.message || 'That request did not complete.');
        return;
      }
      if (mode === 'sign-in' || (mode === 'sign-up' && payload.data?.user)) {
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next === '/projects/new' ? next : '/app');
        return;
      }
      if (mode === 'sign-up') {
        setTone('ok');
        setMessage(payload.data?.message || 'Check your email to continue.');
        setPassword('');
        return;
      }
      if (mode === 'recover') {
        setTone('ok');
        setMessage(payload.data?.message || 'If an account exists, check your email to continue.');
        return;
      }
      if (mode === 'password') {
        setTone('ok');
        setMessage('Password updated. Sign in with your new password.');
        setPassword('');
        router.push('/sign-in?reset=1');
        return;
      }
    } catch (error) {
      setTone('error');
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function startGoogle() {
    setBusy(true);
    setMessage('');
    try {
      const token = await csrfToken();
      const response = await fetch('/api/v1/auth/google', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: '{}',
      });
      const payload = await response.json();
      if (!response.ok) {
        setTone('error');
        setMessage(payload.error?.message || 'Google sign-in is not connected.');
        setBusy(false);
        return;
      }
      const target = new URL(payload.data.authorizationUrl);
      if (target.protocol !== 'https:') throw new Error('Google sign-in URL was rejected.');
      window.location.assign(target.toString());
    } catch (error) {
      setTone('error');
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0F] font-landing text-[#F5F5F7]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <BrandPanel showReels={showReels} />

        <section className="relative flex min-h-screen flex-col bg-[#0B0B0F]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(139,92,246,0.1),transparent_36%)]" aria-hidden="true" />

          <div className="relative flex items-center justify-between gap-4 px-6 pt-6 lg:hidden">
            <Brand compact />
            <BackHome />
          </div>

          <div className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:py-16">
            <div className="w-full max-w-[500px]">
              {mode === 'sign-in' || mode === 'sign-up' ? (
                <AuthTabs active={copy.tab} />
              ) : (
                <Link href="/sign-in" className="inline-flex items-center gap-2 text-xs font-medium text-[#9A9AA5] transition hover:text-white">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                  Back to sign in
                </Link>
              )}

              <p className="mt-9 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4B5FD]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 font-landing text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#9A9AA5]">{copy.subtitle}</p>

              {!config.configured ? (
                <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-200">
                  Sign-in is not configured on this server yet. Forms validate input, then stop.
                </div>
              ) : null}

              {copy.google ? (
                <>
                  <button
                    type="button"
                    onClick={startGoogle}
                    disabled={!config.googleConfigured || busy}
                    title={config.googleConfigured ? 'Continue with Google' : 'Google sign-in is not configured yet'}
                    className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-[#2B2B35] bg-[#141419] px-5 py-3.5 text-sm font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/45 hover:bg-[#1B1B22] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <GoogleMark />
                    {config.googleConfigured ? 'Continue with Google' : 'Continue with Google — setup required'}
                  </button>
                  <div className="my-6 flex items-center gap-4">
                    <span className="h-px flex-1 bg-[#26262E]" />
                    <span className="font-mono text-[9px] normal-case tracking-[0.04em] text-[#9A9AA5]">{copy.divider}</span>
                    <span className="h-px flex-1 bg-[#26262E]" />
                  </div>
                </>
              ) : null}

              <form onSubmit={submit} className={copy.google ? 'space-y-5' : 'mt-7 space-y-5'} noValidate>
                {mode !== 'password' ? (
                  <Field
                    id="email"
                    label={copy.emailLabel}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="creator@studio.com"
                  />
                ) : null}

                {mode !== 'recover' ? (
                  <Field
                    id="password"
                    label={copy.passwordLabel}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === 'sign-up' || mode === 'password' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'password' ? 'At least 12 characters' : '••••••••••••'}
                    fieldTrailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="text-[#9A9AA5] transition hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    }
                  />
                ) : null}

                {mode === 'sign-in' ? (
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-[#9A9AA5]">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        style={{ accentColor: '#8B5CF6' }}
                        className="h-4 w-4 rounded border-[#2B2B35] bg-[#141419]"
                      />
                      Remember me for 30 days
                    </label>
                    <Link href="/recover" className="text-[12px] font-medium text-[#C4B5FD] transition hover:text-white">
                      Forgot password?
                    </Link>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(139,92,246,0.25)] transition hover:bg-[#7C3AED] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Working…' : copy.submit}
                  <span className="material-symbols-outlined text-[17px] transition group-hover:translate-x-0.5" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </form>

              {message ? <Message tone={tone}>{message}</Message> : null}

              <div className="mt-7 space-y-3 text-center text-[13px] text-[#9A9AA5]">
                {mode === 'sign-in' ? (
                  <p>
                    New here?{' '}
                    <Link href="/sign-up" className="font-semibold text-white transition hover:text-[#C4B5FD]">
                      Create an account
                    </Link>
                  </p>
                ) : null}
                {mode === 'sign-up' ? (
                  <>
                    <p>
                      Already registered?{' '}
                      <Link href="/sign-in" className="font-semibold text-white transition hover:text-[#C4B5FD]">
                        Sign in
                      </Link>
                    </p>
                    <p className="text-[10px] leading-4 text-[#9A9AA5]">
                      By creating an account you agree to the{' '}
                      <span className="underline decoration-[#2B2B35] underline-offset-4" title="Not published in this local build">Terms</span>{' '}
                      and{' '}
                      <span className="underline decoration-[#2B2B35] underline-offset-4" title="Not published in this local build">Privacy Policy</span>.
                    </p>
                  </>
                ) : null}
                {mode === 'recover' || mode === 'password' ? (
                  <p>
                    <Link href="/sign-in" className="font-semibold text-white transition hover:text-[#C4B5FD]">
                      Back to sign in
                    </Link>
                  </p>
                ) : null}
                <p>
                  Need help?{' '}
                  <a href="mailto:support@vydrivo.com" className="font-medium text-[#C4B5FD] transition hover:text-white">
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="relative px-6 pb-7 text-center font-mono text-[10px] tracking-[0.12em] text-[#9A9AA5] lg:hidden">
            © 2026 Vydrivo
          </div>
        </section>
      </div>
    </main>
  );
}
