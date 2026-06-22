import {
  getUnsplashAndAck,
  unsplashQueryForDriver,
  unsplashQueryForRace,
  unsplashQueryForTeam,
  UNSPLASH_FALLBACK_QUERY,
  type UnsplashImage,
} from '@apex/api-client/unsplash';

/**
 * Unified hero image helper.
 *
 * Priority order for a hero image, in order of preference:
 *   1. Wikidata image (driver only — actual portrait of the person)
 *   2. Curated Unsplash query (circuit / driver-by-nationality / team)
 *   3. Abstract fallback Unsplash query
 *
 * All paths can return `null` — callers (ParallaxHero, RaceHeroBackdrop)
 * must handle that gracefully by falling back to a flat color block.
 *
 * Why this lives in apps/web/lib rather than the api-client package:
 *   - It composes provider-specific logic (Wikidata + Unsplash) into a
 *     single product-level facade, which is the responsibility of the
 *     app, not the SDK.
 *   - It runs server-side only — `getUnsplashAndAck` reads
 *     `process.env.UNSPLASH_ACCESS_KEY`, so the entire facade must stay
 *     on the server. Do not import from a "use client" boundary.
 */

/**
 * Shape returned to UI callers. We normalise around UnsplashImage even
 * when the source is Wikidata so the renderer (ParallaxHero) doesn't
 * have to branch — attribution fields just go null/empty for Wikimedia.
 */
export interface HeroImageResult {
  /** Where the image actually came from. */
  source: 'wikidata' | 'unsplash-curated' | 'unsplash-fallback';
  /** Primary URL — 1080-ish on the long side. */
  url: string;
  /** 400px placeholder. */
  urlSmall: string;
  /** Hero / full-bleed URL (2048px on Unsplash). */
  urlHero: string;
  /** Always present, even if empty. */
  alt: string;
  /** Photographer name. Empty string for Wikidata. */
  attributionName: string;
  /** Photographer profile URL. Empty string for Wikidata. */
  attributionUrl: string;
  /** Average hex color while image loads. */
  color: string | null;
}

const DEFAULT_REVALIDATE = 60 * 60 * 24 * 7; // 7d, matching client default.

/**
 * Convert a Wikidata Special:FilePath URL into a sized derivative.
 * Mirrors the helper used in driver profile page so behaviour is consistent.
 */
function commonsImageUrl(wikidataImage: string, width: number): string {
  try {
    const u = new URL(wikidataImage);
    u.searchParams.set('width', String(width));
    return u.toString();
  } catch {
    return wikidataImage;
  }
}

function fromUnsplash(
  img: UnsplashImage,
  source: HeroImageResult['source'],
): HeroImageResult {
  return {
    source,
    url: img.url,
    urlSmall: img.urlSmall,
    urlHero: img.urlHero,
    alt: img.alt,
    attributionName: img.attributionName,
    attributionUrl: img.attributionUrl,
    color: img.color,
  };
}

function fromWikidata(commonsUrl: string, altName: string): HeroImageResult {
  return {
    source: 'wikidata',
    url: commonsImageUrl(commonsUrl, 1080),
    urlSmall: commonsImageUrl(commonsUrl, 400),
    urlHero: commonsImageUrl(commonsUrl, 2048),
    alt: altName ? `${altName} portrait` : 'Driver portrait',
    attributionName: '',
    attributionUrl: '',
    color: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public lookups
// ─────────────────────────────────────────────────────────────────────────────

export interface DriverHeroInput {
  /** Full name — used for alt only. */
  fullName: string;
  /** Optional Wikidata Special:FilePath URL — pass null if absent. */
  wikidataImage?: string | null;
  /** Used for the curated query when no Wikidata image. */
  nationality?: string | null;
  revalidate?: number;
}

/**
 * Resolve the hero image for a driver profile.
 *
 *   - Wikidata image present → use it.
 *   - Else: curated Unsplash query (e.g. "British race car helmet dramatic").
 *   - Else: abstract fallback.
 *
 * Returns null only if every path fails (e.g. no Unsplash key AND no
 * Wikidata image). Caller should render a plain color block in that case.
 */
export async function getDriverHeroImage(
  input: DriverHeroInput,
): Promise<HeroImageResult | null> {
  const revalidate = input.revalidate ?? DEFAULT_REVALIDATE;

  if (input.wikidataImage) {
    return fromWikidata(input.wikidataImage, input.fullName);
  }

  const curated = await getUnsplashAndAck({
    query: unsplashQueryForDriver(input.nationality),
    orientation: 'portrait',
    revalidate,
  });
  if (curated) return fromUnsplash(curated, 'unsplash-curated');

  const fallback = await getUnsplashAndAck({
    query: UNSPLASH_FALLBACK_QUERY,
    orientation: 'landscape',
    revalidate,
  });
  if (fallback) return fromUnsplash(fallback, 'unsplash-fallback');

  return null;
}

export interface RaceHeroInput {
  /** Jolpica circuitId / race slug — e.g. "monaco", "spa". */
  circuitSlug: string;
  revalidate?: number;
}

/**
 * Resolve the hero image for a race / circuit page.
 *
 *   - Curated Unsplash query mapped from circuitSlug.
 *   - Else: abstract fallback.
 */
export async function getRaceHeroImage(
  input: RaceHeroInput,
): Promise<HeroImageResult | null> {
  const revalidate = input.revalidate ?? DEFAULT_REVALIDATE;

  const curated = await getUnsplashAndAck({
    query: unsplashQueryForRace(input.circuitSlug),
    orientation: 'landscape',
    revalidate,
  });
  if (curated) return fromUnsplash(curated, 'unsplash-curated');

  const fallback = await getUnsplashAndAck({
    query: UNSPLASH_FALLBACK_QUERY,
    orientation: 'landscape',
    revalidate,
  });
  if (fallback) return fromUnsplash(fallback, 'unsplash-fallback');

  return null;
}

export interface TeamHeroInput {
  /** Jolpica constructorId. */
  teamSlug: string;
  revalidate?: number;
}

export async function getTeamHeroImage(
  input: TeamHeroInput,
): Promise<HeroImageResult | null> {
  const revalidate = input.revalidate ?? DEFAULT_REVALIDATE;

  const curated = await getUnsplashAndAck({
    query: unsplashQueryForTeam(input.teamSlug),
    orientation: 'landscape',
    revalidate,
  });
  if (curated) return fromUnsplash(curated, 'unsplash-curated');

  const fallback = await getUnsplashAndAck({
    query: UNSPLASH_FALLBACK_QUERY,
    orientation: 'landscape',
    revalidate,
  });
  if (fallback) return fromUnsplash(fallback, 'unsplash-fallback');

  return null;
}
