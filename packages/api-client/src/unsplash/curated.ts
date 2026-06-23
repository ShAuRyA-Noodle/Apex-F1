/**
 * Curated query maps.
 *
 * Goal: every hero slot · circuit page, driver profile, team page -
 * resolves to a hand-tuned Unsplash query that produces a cinematic
 * result on the first hit. Raw search like "monaco f1" returns tourist
 * snaps; carefully phrased queries pull editorial-grade frames.
 *
 * Phrasing rules:
 *   - lead with the strongest visual noun (skyline, forest, helmet)
 *   - add ONE mood modifier (cinematic, dramatic, dusk, mist)
 *   - never put "F1" or "Formula 1" · Unsplash's F1 library is thin and
 *     biased toward generic crowd/grandstand shots. Use the venue or
 *     metaphor instead, then style modifier.
 *
 * Keys for the race map are the Jolpica circuitId values used as race
 * slugs throughout Apex (e.g. monaco, spa, silverstone, monza).
 */

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUITS
// Keys = Jolpica circuitId. Values = Unsplash search query.
// ─────────────────────────────────────────────────────────────────────────────

const RACE_QUERIES: Record<string, string> = {
  // EUROPE
  monaco: 'Monaco Monte Carlo skyline cinematic dusk',
  spa: 'Belgian Ardennes forest mist dramatic',
  silverstone: 'British countryside motorsport dawn aerial',
  monza: 'Italian forest royal park autumn morning',
  imola: 'Italian hills Emilia Romagna cinematic',
  hungaroring: 'Budapest skyline summer cinematic',
  catalunya: 'Barcelona Catalonia aerial cinematic',
  red_bull_ring: 'Austrian alps Styria mountains cinematic',
  zandvoort: 'Dutch coast dunes sunset cinematic',
  nurburgring: 'German Eifel forest mist dramatic',
  hockenheimring: 'Black Forest Germany aerial cinematic',
  paul_ricard: 'Provence France mistral landscape cinematic',
  portimao: 'Algarve coast Portugal cliffs dramatic',
  estoril: 'Estoril Portugal Atlantic coast cinematic',

  // MIDDLE EAST
  bahrain: 'Bahrain desert dusk cinematic',
  jeddah: 'Jeddah Saudi Arabia corniche night cinematic',
  yas_marina: 'Abu Dhabi marina night skyline cinematic',
  losail: 'Qatar desert dunes night cinematic',

  // ASIA
  shanghai: 'Shanghai skyline neon night cinematic',
  suzuka: 'Japan Mie prefecture cherry blossom dawn cinematic',
  marina_bay: 'Singapore Marina Bay night skyline cinematic',
  baku: 'Baku Azerbaijan flame towers night cinematic',
  sepang: 'Malaysian rainforest aerial cinematic',
  buddh: 'Indian countryside Uttar Pradesh aerial cinematic',
  korea: 'Yeongam coast South Korea aerial cinematic',
  fuji: 'Mount Fuji Japan aerial cinematic',

  // AMERICAS
  americas: 'Austin Texas hills sunset cinematic',
  rodriguez: 'Mexico City skyline volcano cinematic',
  interlagos: 'Sao Paulo Brazil skyline dramatic',
  miami: 'Miami skyline sunset palm trees cinematic',
  vegas: 'Las Vegas strip night neon cinematic',
  villeneuve: 'Montreal Saint Lawrence river aerial cinematic',
  indianapolis: 'Indianapolis Indiana plains dramatic sky',
  detroit: 'Detroit Michigan skyline river cinematic',

  // OCEANIA
  albert_park: 'Melbourne Australia skyline park dusk cinematic',
  adelaide: 'Adelaide Australia hills cinematic',
};

/** Fallback query used when no circuit-specific mapping exists. */
const RACE_QUERY_FALLBACK = 'race track aerial cinematic dusk';

export function unsplashQueryForRace(circuitSlug: string): string {
  const key = circuitSlug.toLowerCase();
  return RACE_QUERIES[key] ?? RACE_QUERY_FALLBACK;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS
// Used when Wikidata has no portrait. Keyed on lowercased nationality.
// Output: a moody racing-portrait surrogate, NOT an actual person.
// ─────────────────────────────────────────────────────────────────────────────

const NATIONALITY_FLAVOR: Record<string, string> = {
  british: 'British',
  english: 'British',
  dutch: 'Dutch',
  german: 'German',
  monegasque: 'Monegasque',
  spanish: 'Spanish',
  italian: 'Italian',
  french: 'French',
  finnish: 'Finnish',
  australian: 'Australian',
  canadian: 'Canadian',
  mexican: 'Mexican',
  brazilian: 'Brazilian',
  american: 'American',
  japanese: 'Japanese',
  thai: 'Thai',
  chinese: 'Chinese',
  danish: 'Danish',
  belgian: 'Belgian',
  swiss: 'Swiss',
  argentine: 'Argentine',
  argentinian: 'Argentine',
  polish: 'Polish',
  russian: 'Russian',
  austrian: 'Austrian',
  'new zealander': 'New Zealander',
};

export function unsplashQueryForDriver(nationality?: string | null): string {
  if (!nationality) return 'race car helmet dramatic studio lighting';
  const flavor =
    NATIONALITY_FLAVOR[nationality.toLowerCase()] ?? nationality;
  return `${flavor} race car helmet dramatic`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS
// Keyed on team slug (matches Jolpica constructorId values).
// Output query bakes in the team's visual signature color word.
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_COLOR_WORD: Record<string, string> = {
  ferrari: 'red',
  red_bull: 'navy blue',
  mclaren: 'orange papaya',
  mercedes: 'silver',
  aston_martin: 'British racing green',
  alpine: 'electric blue',
  williams: 'cobalt blue',
  rb: 'navy blue',
  alphatauri: 'navy blue',
  sauber: 'green and black',
  haas: 'monochrome white',
};

const TEAM_FALLBACK_COLOR = 'monochrome';

export function unsplashQueryForTeam(teamSlug: string): string {
  const word = TEAM_COLOR_WORD[teamSlug.toLowerCase()] ?? TEAM_FALLBACK_COLOR;
  return `${word} racing wheel motion blur dramatic`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ABSTRACT FALLBACK
// Used by heroImage when nothing else resolves. Stable single query so the
// 7d cache always hits the same record.
// ─────────────────────────────────────────────────────────────────────────────

export const UNSPLASH_FALLBACK_QUERY =
  'abstract motion blur racing track cinematic dark';
