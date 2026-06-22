// Tiny sentiment chip rendered on /latest cards when the underlying provider
// (currently only NewsData.io) exposes a sentiment label. Glass-subtle treatment:
// faint tinted background + a colored dot + lowercase mono caption. The chip
// gracefully renders nothing when the article has no sentiment, so it can be
// dropped into any rail without conditional plumbing upstream.

import type { NewsDataSentiment } from '@apex/api-client/newsdata';

interface SentimentBadgeProps {
  sentiment: NewsDataSentiment | null | undefined;
  /** Optional confidence breakdown. When present, renders the dominant pct. */
  stats?: { positive: number; neutral: number; negative: number } | null;
  /** Make the badge compact (icon only, no label). */
  compact?: boolean;
  className?: string;
}

const STYLES: Record<NewsDataSentiment, {
  dot: string;
  surface: string;
  ring: string;
  label: string;
}> = {
  positive: {
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    surface: 'bg-emerald-400/8',
    ring: 'ring-1 ring-emerald-400/25',
    label: 'text-emerald-300',
  },
  neutral: {
    dot: 'bg-on-surface-variant',
    surface: 'bg-on-surface-variant/8',
    ring: 'ring-1 ring-outline-variant/40',
    label: 'text-on-surface-variant',
  },
  negative: {
    // Brand red for negative. Reuses the telemetry red so the page stays
    // tonally consistent with the rest of the UI.
    dot: 'bg-telemetry-red shadow-[0_0_6px_rgba(225,6,0,0.55)]',
    surface: 'bg-telemetry-red/10',
    ring: 'ring-1 ring-telemetry-red/30',
    label: 'text-telemetry-red',
  },
};

const LABELS: Record<NewsDataSentiment, string> = {
  positive: 'positive',
  neutral: 'neutral',
  negative: 'negative',
};

export function SentimentBadge({
  sentiment,
  stats,
  compact = false,
  className,
}: SentimentBadgeProps) {
  if (!sentiment) return null;
  const s = STYLES[sentiment];
  if (!s) return null;

  // When stats present, surface the dominant confidence (0-100 integer).
  let pct: number | null = null;
  if (stats) {
    const val = stats[sentiment];
    if (typeof val === 'number' && Number.isFinite(val)) {
      pct = Math.round(val);
    }
  }

  const base = [
    'inline-flex items-center gap-1.5 select-none',
    'backdrop-blur-sm',
    s.surface,
    s.ring,
    compact ? 'h-5 w-5 justify-center rounded-full p-0' : 'h-6 rounded-full px-2 py-0.5',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={base}
      aria-label={`sentiment: ${LABELS[sentiment]}${pct !== null ? ` (${pct}%)` : ''}`}
      title={`Sentiment: ${LABELS[sentiment]}${pct !== null ? ` · ${pct}% confidence` : ''}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      {!compact && (
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.14em] ${s.label}`}
        >
          {LABELS[sentiment]}
          {pct !== null && <span className="ml-1 opacity-70">{pct}%</span>}
        </span>
      )}
    </span>
  );
}

export default SentimentBadge;
