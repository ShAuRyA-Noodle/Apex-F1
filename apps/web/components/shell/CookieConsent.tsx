'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STORAGE_KEY = 'apex.consent.v1';
const FIRST_PAINT_DELAY = 800;

type Consent = { analytics: boolean; marketing: boolean; ts: string };

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [granular, setGranular] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return;
    const t = window.setTimeout(() => setOpen(true), FIRST_PAINT_DELAY);
    return () => window.clearTimeout(t);
  }, []);

  function fireConfetti() {
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1000);
  }

  function save(value: Consent) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    fireConfetti();
    window.setTimeout(() => setOpen(false), 480);
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
          ref={rootRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.36, ease: [0.215, 0.61, 0.355, 1] }}
          className="glass-panel fixed z-[60] overflow-hidden
                     bottom-0 left-0 right-0 border-x-0 border-b-0 md:bottom-6 md:right-6 md:left-auto md:max-w-md md:border"
          role="dialog"
          aria-label="Cookie consent"
        >
          {/* Confetti particles */}
          {showConfetti && (
            <>
              <span
                className="confetti-particle"
                style={{ left: '20%', bottom: '50%', background: 'var(--color-telemetry-red)', ['--cx' as string]: '-20px', ['--cr' as string]: '160deg' }}
              />
              <span
                className="confetti-particle"
                style={{ left: '50%', bottom: '50%', background: '#f4f1ea', ['--cx' as string]: '0px', ['--cr' as string]: '-90deg' }}
              />
              <span
                className="confetti-particle"
                style={{ left: '78%', bottom: '50%', background: 'var(--color-telemetry-red)', ['--cx' as string]: '20px', ['--cr' as string]: '210deg' }}
              />
            </>
          )}

          <div className="p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-[20px] text-telemetry-red">
                cookie
              </span>
              <div className="flex-1">
                <p className="font-data text-[10.5px] tracking-[0.22em] text-telemetry-red">
                  CONSENT
                </p>
                <h3 className="mt-2 font-headline text-[17px] font-semibold leading-[1.3] text-on-background">
                  Cookies, but only the ones that actually help.
                </h3>
                <p className="mt-2 font-headline text-[14px] leading-[1.5] text-on-surface-variant">
                  Essential cookies always on. Analytics opt-in. Marketing off by default.
                  Change anytime in{' '}
                  <a href="/legal/privacy" className="underline-offset-2 hover:underline">
                    Privacy
                  </a>
                  .
                </p>

                {granular && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 space-y-2 overflow-hidden"
                  >
                    <TogglePill label="Essential" sublabel="always on" checked disabled />
                    <TogglePill
                      label="Analytics"
                      sublabel="anonymized usage"
                      checked={analytics}
                      onChange={setAnalytics}
                    />
                    <TogglePill
                      label="Marketing"
                      sublabel="off by default"
                      checked={marketing}
                      onChange={setMarketing}
                    />
                  </motion.div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {!granular ? (
                    <>
                      <button
                        type="button"
                        onClick={acceptAll}
                        className="bg-telemetry-red px-4 py-2.5 font-data text-[11px] tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
                      >
                        ACCEPT ALL
                      </button>
                      <button
                        type="button"
                        onClick={() => setGranular(true)}
                        className="border border-outline-variant/60 px-4 py-2.5 font-data text-[11px] tracking-[0.18em] text-on-background transition-colors hover:border-on-background"
                      >
                        CUSTOMIZE
                      </button>
                      <button
                        type="button"
                        onClick={rejectAll}
                        className="px-2 py-2.5 font-data text-[11px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
                      >
                        REJECT
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={savePrefs}
                        className="bg-telemetry-red px-4 py-2.5 font-data text-[11px] tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
                      >
                        SAVE PREFERENCES
                      </button>
                      <button
                        type="button"
                        onClick={() => setGranular(false)}
                        className="px-2 py-2.5 font-data text-[11px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
                      >
                        BACK
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TogglePill({
  label,
  sublabel,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`flex w-full items-center justify-between rounded-sm border px-3 py-2.5 text-left transition-colors ${
        checked
          ? 'border-telemetry-red/50 bg-telemetry-red/10'
          : 'border-outline-variant/40 bg-surface-container/40 hover:border-outline-variant/70'
      } ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
    >
      <div>
        <p className="font-headline text-[14px] font-semibold text-on-background">{label}</p>
        <p className="font-data text-[10px] tracking-[0.14em] text-outline">{sublabel.toUpperCase()}</p>
      </div>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-telemetry-red' : 'bg-outline-variant/60'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-on-background transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
    </button>
  );
}
