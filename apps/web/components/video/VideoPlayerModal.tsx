'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * In-page YouTube player. Click any video thumbnail anywhere in Apex,
 * a glass-pronounced modal opens with the embedded YouTube iframe.
 *
 * Why a modal instead of pushing the user to youtube.com:
 *  - Keeps users on Apex (retention)
 *  - Lets us layer Apex chrome around the player (next video CTA,
 *    related coverage rail, Apex+ upsell — Phase C)
 *  - YouTube's privacy-enhanced domain (youtube-nocookie.com) means we
 *    avoid third-party cookie noise on first visit
 *
 * Trigger surface: any element with [data-apex-video-id="<id>"] [data-apex-video-title="..."]
 * uses event delegation, so we don't have to thread a callback through
 * every rail/card component. One global listener handles everything.
 */
export function VideoPlayerModal() {
  const [open, setOpen] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setVideoId(null);
  }, []);

  // Global event delegation. Any link/anchor inside Apex with
  // data-apex-video-id triggers the modal instead of navigating away.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function onClick(ev: MouseEvent) {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('[data-apex-video-id]');
      if (!trigger) return;
      const id = trigger.getAttribute('data-apex-video-id');
      if (!id) return;
      // Allow modifier-click and middle-click to still open YouTube directly.
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
      ev.preventDefault();
      setVideoId(id);
      setTitle(trigger.getAttribute('data-apex-video-title') ?? '');
      setChannel(trigger.getAttribute('data-apex-video-channel') ?? '');
      setOpen(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Lock background scroll + handle ESC.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Body overflow alone doesn't stop Lenis (it drives its own scroll loop),
    // so the page slides behind the modal on desktop. Pause it while open.
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();

    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);

    // Focus the close button once mounted for keyboard a11y.
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && videoId && (
        <motion.div
          key={videoId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Video player'}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close player"
            onClick={close}
            className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
          />

          {/* Player frame */}
          <motion.div
            initial={{ scale: 0.96, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
            className="relative z-10 w-full max-w-5xl overflow-hidden border border-outline-variant/40 bg-carbon-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 bg-surface-container/40 px-5 py-4 backdrop-blur md:px-7">
              <div className="min-w-0 flex-1">
                <div className="font-data text-[10.5px] tracking-[0.22em] text-telemetry-red">
                  APEX · IN-PAGE PLAYER
                </div>
                {title && (
                  <h2 className="mt-1.5 truncate font-headline text-base text-on-background md:text-lg">
                    {title}
                  </h2>
                )}
                {channel && (
                  <div className="mt-0.5 truncate font-data text-[11px] tracking-[0.18em] text-on-surface-variant">
                    {channel}
                  </div>
                )}
              </div>
              <button
                ref={closeBtnRef}
                onClick={close}
                aria-label="Close player"
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center border border-outline-variant/40 text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-on-background"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={title || 'YouTube video player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 border-t border-outline-variant/30 bg-surface-container/40 px-5 py-3 backdrop-blur md:px-7">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-data text-[10.5px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
              >
                OPEN AT YOUTUBE ↗
              </a>
              <button
                onClick={close}
                className="font-data text-[10.5px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-telemetry-red"
              >
                ESC TO CLOSE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
