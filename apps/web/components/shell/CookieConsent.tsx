'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STORAGE_KEY = 'apex.consent.v1';

type Consent = { analytics: boolean; marketing: boolean; ts: string };

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [granular, setGranular] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) setOpen(true);
  }, []);

  function save(value: Consent) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setOpen(false);
  }

  function acceptAll() {
    save({ analytics: true, marketing: true, ts: new Date().toISOString() });
  }
  function rejectAll() {
    save({ analytics: false, marketing: false, ts: new Date().toISOString() });
  }
  function savePrefs() {
    save({ analytics, marketing, ts: new Date().toISOString() });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-3xl rounded-xl border border-outline-variant/60 bg-surface-container/95 p-5 shadow-2xl backdrop-blur-xl md:bottom-6 md:p-6"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined hidden text-[24px] text-telemetry-red md:block">
              cookie
            </span>
            <div className="flex-1">
              <h3 className="text-data text-telemetry-red">CONSENT</h3>
              <p className="mt-2 text-sm text-on-surface">
                Apex uses cookies for essential functionality and (with your consent)
                anonymized analytics. Marketing cookies are off by default. You can change
                this anytime in{' '}
                <a href="/legal/privacy" className="underline">
                  Privacy
                </a>
                .
              </p>

              {granular && (
                <div className="mt-4 space-y-2 text-sm">
                  <label className="flex items-center gap-3 text-on-surface">
                    <input type="checkbox" checked disabled className="accent-telemetry-red" />
                    Essential <span className="text-outline">(always on)</span>
                  </label>
                  <label className="flex items-center gap-3 text-on-surface">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="accent-telemetry-red"
                    />
                    Analytics
                  </label>
                  <label className="flex items-center gap-3 text-on-surface">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="accent-telemetry-red"
                    />
                    Marketing
                  </label>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {!granular && (
                  <>
                    <button
                      onClick={acceptAll}
                      className="bg-telemetry-red px-5 py-2 text-sm font-semibold uppercase tracking-wider text-on-background transition-opacity hover:opacity-90"
                    >
                      Accept all
                    </button>
                    <button
                      onClick={rejectAll}
                      className="border border-outline-variant px-5 py-2 text-sm font-semibold uppercase tracking-wider text-on-surface transition-colors hover:border-on-background"
                    >
                      Reject all
                    </button>
                    <button
                      onClick={() => setGranular(true)}
                      className="text-sm uppercase tracking-wider text-on-surface-variant underline-offset-4 transition-colors hover:text-on-background hover:underline"
                    >
                      Customize
                    </button>
                  </>
                )}
                {granular && (
                  <>
                    <button
                      onClick={savePrefs}
                      className="bg-telemetry-red px-5 py-2 text-sm font-semibold uppercase tracking-wider text-on-background transition-opacity hover:opacity-90"
                    >
                      Save preferences
                    </button>
                    <button
                      onClick={() => setGranular(false)}
                      className="text-sm uppercase tracking-wider text-on-surface-variant transition-colors hover:text-on-background"
                    >
                      Back
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
