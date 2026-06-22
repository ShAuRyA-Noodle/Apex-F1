/**
 * Unsplash API raw response types.
 *
 * Endpoint base:  https://api.unsplash.com
 * Auth header:    Authorization: Client-ID <UNSPLASH_ACCESS_KEY>
 * Accept header:  Accept-Version: v1
 *
 * Search endpoint we use:
 *   GET /search/photos?query=Q&per_page=10&orientation=landscape
 *
 * Tier limits (free Developer):  50 req/hour
 * Production tier (after review): 5,000 req/hour
 *
 * License obligation: when an image is consumed in production we MUST ping
 * /photos/:id/download (the photo's links.download_location URL) so the
 * photographer's stats register a download. We don't need to follow the
 * redirect — the ping itself is the trigger.
 *   Spec: https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download
 */

/** Envelope returned by GET /search/photos. */
export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

/** A single photo record. Only fields we actually use are typed. */
export interface UnsplashPhoto {
  id: string;
  /** Width and height in pixels — used for aspect-ratio sanity checks. */
  width: number;
  height: number;
  /** Average color hex, useful as a CSS background placeholder. */
  color: string | null;
  /** Photographer-supplied description (often null). */
  description: string | null;
  /** Auto-generated alt — short, descriptive, English. */
  alt_description: string | null;
  urls: UnsplashUrls;
  links: UnsplashLinks;
  user: UnsplashUser;
}

/**
 * Pre-sized image URLs Unsplash exposes.
 *
 *  - raw      → original, append &w= as needed for derivatives
 *  - full     → 2048px on the long side
 *  - regular  → 1080px on the long side  ← what we ship as hero
 *  - small    → 400px on the long side   ← cards / placeholders
 *  - thumb    → 200px on the long side
 */
export interface UnsplashUrls {
  raw: string;
  full: string;
  regular: string;
  small: string;
  thumb: string;
}

/**
 * `download_location` is the API endpoint we must hit (with our auth header)
 * to register a download per the API guidelines. NOT the same as `download`
 * which is the direct file URL meant for browsers.
 */
export interface UnsplashLinks {
  self: string;
  html: string;
  download: string;
  download_location: string;
}

/** Photographer profile — we only render `name` + `links.html`. */
export interface UnsplashUser {
  id: string;
  username: string;
  name: string;
  /** Twitter/Instagram handles are nullable — ignored for now. */
  links: {
    self: string;
    html: string;
    photos: string;
  };
}

/** Possible orientations the search API accepts. */
export type UnsplashOrientation = 'landscape' | 'portrait' | 'squarish';

/** Error envelope returned for 4xx/5xx. */
export interface UnsplashError {
  errors: string[];
}
