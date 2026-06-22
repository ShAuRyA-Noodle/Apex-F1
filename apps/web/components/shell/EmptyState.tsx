'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Apex empty states
 * Every component that can hit "no data" or "fetch failed" should render this.
 * Voice is Apex: a touch dry, never "no data", always a retry path.
 *
 * Presets are defined per-surface below: SocialPulseEmpty, StandingsEmpty,
 * VideoRailEmpty, ScheduleEmpty, NewsRailEmpty, SearchEmpty.
 */

type EmptyStateProps = {
  icon: string;            // Material Symbols Outlined name
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  variant?: 'inline' | 'panel';
};

export function EmptyState({
  icon,
  eyebrow,
  title,
  desc,
  action,
  variant = 'panel',
}: EmptyStateProps) {
  const container =
    variant === 'panel'
      ? 'flex flex-col items-center text-center border border-dashed border-outline-variant/50 bg-surface-container/20 px-8 py-14'
      : 'flex flex-col items-center text-center py-10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
      className={container}
      role="status"
    >
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container/40">
        <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
          {icon}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-telemetry-red" />
      </span>

      {eyebrow && (
        <p className="mt-5 font-data text-[10.5px] tracking-[0.22em] text-telemetry-red">
          {eyebrow.toUpperCase()}
        </p>
      )}

      <h3 className="mt-3 max-w-md font-headline text-[20px] font-semibold leading-[1.3] text-on-background md:text-[22px]">
        {title}
      </h3>

      {desc && (
        <p className="mt-3 max-w-md font-headline text-[14.5px] leading-[1.55] text-on-surface-variant">
          {desc}
        </p>
      )}

      {action && (
        <ActionLink action={action} />
      )}
    </motion.div>
  );
}

function ActionLink({ action }: { action: NonNullable<EmptyStateProps['action']> }) {
  const cls =
    'mt-6 inline-flex items-center gap-2 border border-on-background bg-on-background px-4 py-2.5 font-data text-[11px] tracking-[0.18em] text-background transition-colors hover:bg-telemetry-red hover:border-telemetry-red hover:text-on-background';
  if (action.href) {
    return (
      <a href={action.href} className={cls}>
        <span>{action.label.toUpperCase()}</span>
        <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      <span>{action.label.toUpperCase()}</span>
      <span className="material-symbols-outlined text-[16px]">refresh</span>
    </button>
  );
}

/* ============================================================
 * Per-surface presets · use these by name across the app
 * ============================================================ */

export function SocialPulseEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="forum"
      eyebrow="Pulse paused"
      title="Reddit rate limiter is pissed off."
      desc="Their API just slowed us down to a crawl. Tap retry, or come back in a minute."
      action={{ label: 'Retry pulse', onClick: onRetry }}
    />
  );
}

export function StandingsEmpty() {
  return (
    <EmptyState
      icon="leaderboard"
      eyebrow="No standings yet"
      title="The season hasn't started turning numbers."
      desc="Standings appear after lights out of round one. Browse last year while you wait."
      action={{ label: 'See 2025 standings', href: '/results/2025/drivers' }}
    />
  );
}

export function ScheduleEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="flag_circle"
      eyebrow="Calendar offline"
      title="Jolpica took a coffee break."
      desc="Schedule feed is down for a moment. Calendar will be back in a sec."
      action={{ label: 'Retry calendar', onClick: onRetry }}
    />
  );
}

export function VideoRailEmpty() {
  return (
    <EmptyState
      icon="movie"
      title="No fresh tape yet."
      desc="YouTube channel feeds are quiet right now. Check back after the next session."
      action={{ label: 'Browse video archive', href: '/video' }}
    />
  );
}

export function NewsRailEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="feed"
      eyebrow="News stream stalled"
      title="Editors are between filings."
      desc="No new wires in the last refresh window. We'll auto-refetch in 60s."
      action={{ label: 'Force refresh', onClick: onRetry }}
    />
  );
}

export function SearchEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon="search_off"
      title={`No hits for "${query}".`}
      desc="Try a driver number, a circuit slug, or a season year (e.g. 2024)."
      action={{ label: 'Open archive', href: '/results/archive' }}
    />
  );
}

export function GenericFetchError({
  onRetry,
  children,
}: {
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <EmptyState
      icon="cloud_off"
      eyebrow="Surface stalled"
      title={children ? String(children) : 'Upstream feed dropped a packet.'}
      desc="Self-heal kicks in shortly. You can also force a retry."
      action={{ label: 'Retry', onClick: onRetry }}
    />
  );
}
