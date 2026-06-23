import type { UnsplashPhoto } from './types';

/**
 * UI-facing image shape. We intentionally collapse the raw photo down to
 * just the fields the renderer needs · never ship the full envelope.
 *
 * `attributionName` + `attributionUrl` are mandatory under the Unsplash
 * license. Components that render an UnsplashImage MUST render both as
 * visible text linked to the photographer's profile.
 *
 * `downloadLocation` is the per-image endpoint we ping when the photo is
 * actually shown to a user. See getUnsplashAndAck() in client.ts.
 */
export interface UnsplashImage {
  /** Stable Unsplash photo id (used for caching + dedup). */
  id: string;
  /** 1080px on the long side · primary URL we ship. */
  url: string;
  /** 400px on the long side · list cards, blur-up placeholders. */
  urlSmall: string;
  /** 2048px on the long side · full-bleed hero / parallax. */
  urlHero: string;
  /** Auto-generated or photographer-supplied alt text. */
  alt: string;
  /** Average hex color · use as CSS background while image loads. */
  color: string | null;
  /** Photographer display name, e.g. "Marc Najera". */
  attributionName: string;
  /**
   * Public profile URL, with the obligatory UTM tags Unsplash requires.
   * Spec: https://help.unsplash.com/en/articles/2511315-guideline-attribution
   */
  attributionUrl: string;
  /**
   * The /photos/:id/download URL we MUST hit (with our auth header) when
   * an image is actually rendered in production. The hit registers a
   * download in the photographer's stats and keeps Apex compliant.
   */
  downloadLocation: string;
  /** Pixel dims · useful for aspect-ratio reservations / LCP hints. */
  width: number;
  height: number;
}

const UTM = 'utm_source=apex&utm_medium=referral';

/**
 * Map a raw Unsplash search result into the trimmed UI shape.
 * Pure, side-effect free, safe to run on any tier.
 */
export function mapUnsplashPhoto(raw: UnsplashPhoto): UnsplashImage {
  const attributionUrl = `${raw.user.links.html}?${UTM}`;
  const alt =
    raw.alt_description?.trim() ||
    raw.description?.trim() ||
    `Photo by ${raw.user.name} on Unsplash`;

  return {
    id: raw.id,
    url: raw.urls.regular,
    urlSmall: raw.urls.small,
    urlHero: raw.urls.full,
    alt,
    color: raw.color,
    attributionName: raw.user.name,
    attributionUrl,
    downloadLocation: raw.links.download_location,
    width: raw.width,
    height: raw.height,
  };
}
