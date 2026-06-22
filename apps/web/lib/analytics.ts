/**
 * analytics · central wrapper around server + client analytics.
 *
 * Phase C wires:
 *  - PostHog (POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_KEY) for client events + feature flags
 *  - PostHog server-side event mirror for events that originate server-side
 *  - Sentry (SENTRY_DSN) for error reporting
 *
 * Until keys land in env, every call here is a no-op. Code paths that use these
 * helpers ship today and start emitting the moment a key is provisioned.
 */

export type EventName =
  | 'pageview'
  | 'nav_click'
  | 'article_card_click'
  | 'video_play'
  | 'race_ticker_click'
  | 'standings_view_all'
  | 'commerce_click'
  | 'load_more'
  | 'search'
  | 'filter_change'
  | 'embed_view'
  | 'newsletter_subscribe'
  | 'apex_plus_interest'
  | 'live_session_join'
  | 'live_session_leave';

export interface EventProps {
  [k: string]: string | number | boolean | undefined | null;
}

/** Server-side event capture. Mirrors to PostHog when key exists. */
export async function captureServer(event: EventName, props: EventProps = {}) {
  const key = process.env.POSTHOG_KEY;
  const host = process.env.POSTHOG_HOST ?? 'https://app.posthog.com';
  if (!key) return; // no-op until provisioned

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: props.distinct_id ?? 'anonymous',
        timestamp: new Date().toISOString(),
        properties: { ...props, source: 'apex-web-server' },
      }),
      // Don't block requests on analytics · short timeout
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // analytics must never throw
  }
}

/** Client-side event capture. */
export function captureClient(event: EventName, props: EventProps = {}) {
  if (typeof window === 'undefined') return;
  // PostHog snippet loaded in layout when key present.
  const ph = (window as unknown as { posthog?: { capture: (e: string, p: EventProps) => void } }).posthog;
  if (ph) {
    ph.capture(event, props);
  }
}
