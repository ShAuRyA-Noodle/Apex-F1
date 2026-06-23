// Country-code → flag emoji and other small format helpers.
// Pure functions. No deps.

const NATIONALITY_TO_CC: Record<string, string> = {
  British: 'GB',
  English: 'GB',
  Scottish: 'GB',
  Welsh: 'GB',
  'Northern Irish': 'GB',
  Dutch: 'NL',
  German: 'DE',
  French: 'FR',
  Spanish: 'ES',
  Italian: 'IT',
  Monégasque: 'MC',
  Monegasque: 'MC',
  Brazilian: 'BR',
  Argentine: 'AR',
  Argentinian: 'AR',
  Mexican: 'MX',
  American: 'US',
  Canadian: 'CA',
  Australian: 'AU',
  'New Zealander': 'NZ',
  Thai: 'TH',
  Japanese: 'JP',
  Chinese: 'CN',
  Finnish: 'FI',
  Belgian: 'BE',
  Austrian: 'AT',
  Swiss: 'CH',
  Swedish: 'SE',
  Danish: 'DK',
  Polish: 'PL',
  Russian: 'RU',
  Indian: 'IN',
  Hungarian: 'HU',
  Colombian: 'CO',
  Venezuelan: 'VE',
  Czech: 'CZ',
  Portuguese: 'PT',
  Irish: 'IE',
  'South African': 'ZA',
  Malaysian: 'MY',
  Indonesian: 'ID',
  Liechtensteiner: 'LI',
};

const COUNTRY_TO_CC: Record<string, string> = {
  Australia: 'AU',
  Austria: 'AT',
  Azerbaijan: 'AZ',
  Bahrain: 'BH',
  Belgium: 'BE',
  Brazil: 'BR',
  Canada: 'CA',
  China: 'CN',
  France: 'FR',
  Germany: 'DE',
  Hungary: 'HU',
  Italy: 'IT',
  Japan: 'JP',
  Malaysia: 'MY',
  Mexico: 'MX',
  Monaco: 'MC',
  Netherlands: 'NL',
  Portugal: 'PT',
  Qatar: 'QA',
  Russia: 'RU',
  'Saudi Arabia': 'SA',
  Singapore: 'SG',
  Spain: 'ES',
  Turkey: 'TR',
  UAE: 'AE',
  'United Arab Emirates': 'AE',
  UK: 'GB',
  'United Kingdom': 'GB',
  USA: 'US',
  'United States': 'US',
  Vietnam: 'VN',
};

export function nationalityToCountryCode(nat?: string): string | null {
  if (!nat) return null;
  return NATIONALITY_TO_CC[nat] ?? null;
}

export function countryNameToCode(name?: string): string | null {
  if (!name) return null;
  return COUNTRY_TO_CC[name] ?? null;
}

export function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return '🏁';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (cc.toUpperCase().charCodeAt(0) - 65),
    base + (cc.toUpperCase().charCodeAt(1) - 65),
  );
}

export function formatDateRange(startIso: string, endIso?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const start = new Date(startIso);
  const startStr = start.toLocaleDateString('en-GB', opts);
  if (!endIso) return startStr;
  const end = new Date(endIso);
  const endStr = end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

const TEAM_COLOR_BY_SLUG: Record<string, string> = {
  red_bull: '#0600EF',
  mclaren: '#FF8000',
  ferrari: '#DC0000',
  mercedes: '#00D2BE',
  aston_martin: '#006F62',
  alpine: '#0090FF',
  williams: '#005AFF',
  rb: '#1E41FF',
  sauber: '#900000',
  haas: '#FFFFFF',
  // historical / common aliases
  haas_ferrari: '#FFFFFF',
  alphatauri: '#1E41FF',
  alpha_tauri: '#1E41FF',
  alfa: '#900000',
  alfa_romeo: '#900000',
  lotus_f1: '#000000',
  renault: '#FFF500',
  toro_rosso: '#1E41FF',
  honda: '#E8002D',
  bmw_sauber: '#293483',
  brawn: '#80FF00',
  jordan: '#FFFF00',
  stewart: '#FFFFFF',
  jaguar: '#005A30',
};

export function teamColorBySlug(slug?: string): string {
  if (!slug) return '#444748';
  return TEAM_COLOR_BY_SLUG[slug] ?? '#888888';
}
