import {
  getUnsplashAndAck,
  unsplashQueryForDriver,
  unsplashQueryForRace,
  unsplashQueryForTeam,
  UNSPLASH_FALLBACK_QUERY,
  type UnsplashImage,
} from '@apex/api-client/unsplash';
import { generateImage } from '@apex/api-client/huggingface';
import { getWikipediaSummaryByUrl } from '@apex/api-client/wikipedia';

/**
 * Unified hero image helper.
 *
 * Priority order for a hero image, in order of preference:
 *   1. Wikidata image (driver only — actual portrait of the person).
 *   2. Curated Unsplash query (circuit / driver-by-nationality / team).
 *   3. Abstract fallback Unsplash query.
 *   4. Hugging Face generated image (FLUX.1-schnell). Only fires when
 *      HUGGINGFACE_TOKEN is provisioned AND every Unsplash path returned
 *      null (no key, or no matching photo). Stub-mode noop otherwise.
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
  source: 'wikidata' | 'unsplash-curated' | 'unsplash-fallback' | 'hf-generated';
  /** Primary URL — 1080-ish on the long side. */
  url: string;
  /** 400px placeholder. */
  urlSmall: string;
  /** Hero / full-bleed URL (2048px on Unsplash). */
  urlHero: string;
  /** Always present, even if empty. */
  alt: string;
  /** Photographer name. Empty string for Wikidata and HF. */
  attributionName: string;
  /** Photographer profile URL. Empty string for Wikidata and HF. */
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

/**
 * Tier-4 generator. Only fires when HUGGINGFACE_TOKEN is set; otherwise
 * generateImage() short-circuits to null and we propagate that.
 *
 * Why a data URL: this helper is consumed by RSC server components that
 * render full-bleed hero PNGs. Cycling through R2 here would require an
 * upload-on-demand round-trip inside the render path. For Phase B we
 * inline the bytes (~150-300KB) as a data URL — fine for first paint,
 * and Next.js de-dupes identical hero markup across ISR slots. Phase C
 * swaps this for an R2 URL produced by /api/ai/generate-image, cached
 * by prompt hash.
 */
async function tryHfGenerated(
  prompt: string,
  alt: string,
): Promise<HeroImageResult | null> {
  const img = await generateImage({
    prompt,
    style: 'cinematic-telemetry',
    aspect: '16:9',
    writeToTmp: false,
  });
  if (!img) return null;
  const dataUrl = `data:image/png;base64,${img.pngBuffer.toString('base64')}`;
  return {
    source: 'hf-generated',
    url: dataUrl,
    urlSmall: dataUrl,
    urlHero: dataUrl,
    alt,
    attributionName: '',
    attributionUrl: '',
    color: null,
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
  /** Wikipedia page URL — every Jolpica driver has one. Used for fallback image. */
  wikiUrl?: string | null;
  /** Used for the curated query when no Wikidata image. */
  nationality?: string | null;
  revalidate?: number;
}

function fromWikipedia(thumbUrl: string, fullName: string): HeroImageResult {
  return {
    source: 'wikidata',
    url: thumbUrl,
    urlSmall: thumbUrl,
    urlHero: thumbUrl,
    alt: `${fullName} portrait`,
    attributionName: '',
    attributionUrl: '',
    color: null,
  };
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

  // Tier 1 — Wikipedia REST API summary. Every Jolpica driver has a wikiUrl
  // and the REST endpoint reliably returns originalimage/thumbnail for the
  // article. This is the primary source because:
  //   - Always lookup-by-URL — no exact-label fuzz like Wikidata SPARQL
  //   - Returns HTTPS upload.wikimedia.org URLs (Wikidata returns http://
  //     commons.wikimedia.org/wiki/Special:FilePath/ which Next.js sometimes
  //     refuses to optimise and SSR-render reliably)
  //   - Returns the canonical infobox photo curated by Wikipedia editors
  if (input.wikiUrl) {
    const summary = await getWikipediaSummaryByUrl(input.wikiUrl, {
      revalidate,
    });
    const img = summary?.originalImageUrl ?? summary?.thumbnailUrl;
    if (img) {
      return fromWikipedia(img, input.fullName);
    }
  }

  // Tier 2 — Wikidata Commons Special:FilePath fallback. SPARQL exact-label
  // match is flaky for drivers with special characters in their canonical
  // Wikidata label, so we accept this only as a fallback.
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

  // Tier 4 — HF generated. Null when token absent (stub-mode).
  const generated = await tryHfGenerated(
    `Portrait of a Formula 1 racing driver of ${input.nationality ?? 'European'} nationality, full racing suit and helmet, paddock background, premium editorial sports photography`,
    `${input.fullName} portrait (generated)`,
  );
  if (generated) return generated;

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

  // Tier 4 — HF generated. Null when token absent (stub-mode).
  const generated = await tryHfGenerated(
    `Formula 1 race weekend at ${input.circuitSlug} circuit, cinematic wide shot, golden hour light hitting the start-finish straight, pit lane garages, dramatic motorsport photography`,
    `${input.circuitSlug} circuit (generated)`,
  );
  if (generated) return generated;

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

  // Tier 4 — HF generated. Null when token absent (stub-mode).
  const generated = await tryHfGenerated(
    `Formula 1 team garage for ${input.teamSlug}, mechanics working on a car under pit lane lights, telemetry-red accents, cinematic editorial photography`,
    `${input.teamSlug} garage (generated)`,
  );
  if (generated) return generated;

  return null;
}
