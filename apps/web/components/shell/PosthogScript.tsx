'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Loads PostHog only when BOTH are true:
 *   1. NEXT_PUBLIC_POSTHOG_KEY is set, and
 *   2. the visitor granted analytics consent in the cookie banner
 *      (apex.consent.v1 → { analytics: true }).
 * "Reject" in the banner means PostHog never initializes. No-op until both hold;
 * a consent change takes effect on the next page load.
 */
export function PosthogScript() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';
  const [analyticsOk, setAnalyticsOk] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem('apex.consent.v1');
        setAnalyticsOk(raw ? Boolean(JSON.parse(raw)?.analytics) : false);
      } catch {
        setAnalyticsOk(false);
      }
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  if (!key || !analyticsOk) return null;
  return (
    <Script id="posthog-init" strategy="afterInteractive">
      {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${key}',{api_host:'${host}',capture_pageview:true,persistence:'localStorage+cookie'})`}
    </Script>
  );
}
