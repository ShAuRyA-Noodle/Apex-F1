'use client';

import { useState } from 'react';
import { captureClient } from '@/lib/analytics';

export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setState('error');
      return;
    }
    setState('pending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        captureClient('newsletter_subscribe');
        setState('success');
        setEmail('');
        window.setTimeout(() => setState('idle'), 4000);
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-20 md:px-grid-margin md:py-32">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-data text-telemetry-red">RACE WEEK</h2>
            <p className="mt-4 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
              The briefing that lands before lights out.
            </p>
            <p className="mt-6 max-w-xl font-editorial text-lg text-on-surface-variant md:text-2xl">
              One concise edition every race week: strategy preview, tyre intel, paddock corner,
              standings recap. No spam.
            </p>
          </div>
          <form onSubmit={onSubmit} className="md:justify-self-end">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== 'idle') setState('idle');
                }}
                placeholder="you@somewhere.com"
                aria-label="Email address"
                required
                className="min-w-0 flex-1 border border-outline-variant bg-surface-container-low px-5 py-4 font-headline text-base text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none"
              />
              <button
                type="submit"
                disabled={state === 'pending'}
                className="bg-telemetry-red px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {state === 'pending' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
            {state === 'success' && (
              <p className="mt-3 text-sm text-on-surface">✓ You&apos;re in. First edition lands Friday.</p>
            )}
            {state === 'error' && (
              <p className="mt-3 text-sm text-telemetry-red">Enter a valid email.</p>
            )}
            <p className="mt-3 text-xs text-outline">
              By subscribing you agree to our{' '}
              <a href="/legal/privacy" className="underline underline-offset-2">
                Privacy Policy
              </a>
              . Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
