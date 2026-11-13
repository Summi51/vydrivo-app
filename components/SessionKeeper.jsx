'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSession } from '../lib/session-fetch.js';

export default function SessionKeeper() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshed = await refreshSession();
      if (cancelled) return;
      if (!refreshed) {
        router.replace('/sign-in?expired=1');
        return;
      }
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
