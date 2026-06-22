// Map raw Giphy results -> UiGif (the canonical shape rendered by Apex UI).
//
// We deliberately strip the ~25-rendition `images` block down to the three
// renditions the platform actually uses:
//   - `gifUrl`         (downsized_medium, <= 5MB)         -> animated frame
//   - `previewUrl`     (preview_gif, ~50KB)               -> lazy placeholder
//   - `stillUrl`       (original_still, JPG poster)       -> reduced-motion
//
// Anything beyond that is dead payload weight and a future maintenance trap.

import type { GiphyGif, GiphyImageRendition } from './types';

/** Canonical GIF shape consumed by every reaction-GIF surface on Apex. */
export interface UiGif {
  /** Stable Giphy id. Use as React key. */
  id: string;
  /** Headline / alt text. */
  title: string;
  /** Public giphy.com landing page (used by the attribution badge click). */
  giphyUrl: string;
  /**
   * Animated rendition (~5MB cap). Always present - if Giphy returned a
   * result without `downsized_medium` we filtered it out in the client.
   */
  gifUrl: string;
  /** Pixel width of `gifUrl`. */
  gifWidth: number;
  /** Pixel height of `gifUrl`. */
  gifHeight: number;
  /** Tiny low-quality animated preview, for lazy-load. May be undefined. */
  previewUrl?: string;
  /** Single-frame JPG poster. Used when `prefers-reduced-motion: reduce`. */
  stillUrl?: string;
  /** Source rating (always `g` on Apex). */
  rating: string;
  /** Uploader display name, when present. */
  uploader?: string;
}

/** Parse a stringified pixel dimension, defaulting to 0 on garbage input. */
function toPx(s: string | undefined): number {
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Return the rendition URL, or undefined if Giphy shipped an empty string. */
function safeUrl(r: GiphyImageRendition | undefined): string | undefined {
  if (!r) return undefined;
  const url = (r.url || '').trim();
  return url.length > 0 ? url : undefined;
}

/** Map a single Giphy GIF -> UiGif. */
export function mapGiphyGif(g: GiphyGif): UiGif {
  const downsized = g.images.downsized_medium;
  return {
    id: g.id,
    title: (g.title || '').trim() || 'reaction',
    giphyUrl: g.url,
    gifUrl: downsized.url,
    gifWidth: toPx(downsized.width),
    gifHeight: toPx(downsized.height),
    previewUrl: safeUrl(g.images.preview_gif),
    stillUrl: safeUrl(g.images.original_still),
    rating: g.rating,
    uploader: g.user?.display_name?.trim() || undefined,
  };
}

/** Map a batch. Drops anything that fails the basic field check. */
export function mapGiphyGifs(gifs: GiphyGif[]): UiGif[] {
  return gifs
    .filter(
      (g) => g && g.id && g.url && g.images?.downsized_medium?.url,
    )
    .map(mapGiphyGif);
}

/**
 * Pick a single GIF from a batch, biased toward the first result. Giphy's
 * default sort is relevance, so the top hit is almost always the strongest
 * reaction; we only fall back further down the list if Giphy returned
 * something obviously broken at index 0. Returns undefined on empty input.
 */
export function pickFirstGiphyGif(gifs: GiphyGif[]): UiGif | undefined {
  const mapped = mapGiphyGifs(gifs);
  return mapped[0];
}
