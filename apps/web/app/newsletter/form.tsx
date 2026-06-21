'use client';

import { useState } from 'react';

const STORAGE_KEY = 'apex.newsletter.pending.v1';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState('error');
      setError('Enter a valid email.');
      return;
    }
    setState('submitting');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // also queue locally in case backend rejects later
      try {
        const queue: string[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        if (!queue.includes(trimmed)) queue.push(trimmed);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      } catch {
        /* no-op */
      }
      setState('success');
      setEmail('');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <label className="text-data block text-outline">Your email</label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== 'idle') setState('idle');
          }}
          placeholder="you@somewhere.com"
          aria-label="Email address"
          autoComplete="email"
          required
          disabled={state === 'submitting'}
          className="min-w-0 flex-1 border border-outline-variant bg-surface-container-low px-5 py-4 font-headline text-base text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="bg-telemetry-red px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {state === 'submitting' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>
      {state === 'success' && (
        <p className="mt-3 text-sm text-on-surface">
          ✓ Captured. First edition lands the next race week.
        </p>
      )}
      {state === 'error' && (
        <p className="mt-3 text-sm text-telemetry-red">{error}</p>
      )}
      <p className="mt-3 text-xs text-outline">
        By subscribing you agree to our{' '}
        <a href="/legal/privacy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        . Unsubscribe with one click in every email.
      </p>
    </form>
  );
}
