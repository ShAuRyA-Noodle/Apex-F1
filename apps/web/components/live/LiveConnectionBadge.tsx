'use client';

import { useEffect, useState } from 'react';
import { useLiveStream } from './LiveStreamHook';

/**
 * Compact connection-state badge for /live/* surfaces.
 * Renders a colored dot + label. Pulses red when live data is flowing.
 *
 * Drop this into any /live/* header to show the user the stream is real-time.
 *
 * The `fresh` flag is computed inside a useEffect interval so the wall-clock
 * comparison never runs during the SSR render. Audit (wf_c028f45c-79a) flagged
 * the previous inline `Date.now() - lastFrameAt` as a latent hydration
 * footgun · the moment anyone seeds `lastFrameAt` from a server cache, the
 * dotClass string would diverge between SSR and the first client render.
 */
export function LiveConnectionBadge() {
  const { connection, lastFrameAt } = useLiveStream();
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (!lastFrameAt) {
      setFresh(false);
      return;
    }
    const tick = () => setFresh(Date.now() - lastFrameAt < 10_000);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lastFrameAt]);

  const label =
    connection === 'open'
      ? fresh
        ? 'LIVE STREAM'
        : 'CONNECTED'
      : connection === 'reconnecting'
        ? 'RECONNECTING'
        : connection === 'closed'
          ? 'OFFLINE'
          : 'CONNECTING';

  const dotClass =
    connection === 'open' && fresh
      ? 'bg-telemetry-red shadow-[0_0_8px_rgba(225,6,0,0.7)] animate-pulse'
      : connection === 'open'
        ? 'bg-emerald-400'
        : connection === 'reconnecting'
          ? 'bg-amber-400'
          : connection === 'closed'
            ? 'bg-outline'
            : 'bg-outline-variant';

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container/50 px-3 py-1 backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
      <span className="font-data text-[10.5px] tracking-[0.18em] text-on-surface-variant">
        {label}
      </span>
    </span>
  );
}
