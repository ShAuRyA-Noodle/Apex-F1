// Phase-A mock 2026 grid. Replaced by Jolpica + Wikidata ingest in Phase B.

export type DriverFixture = {
  slug: string;
  code: string;
  number: number;
  firstName: string;
  lastName: string;
  countryCode: string;
  teamSlug: string;
  teamColor: string;
  headshotUrl?: string;
};

export const grid2026: DriverFixture[] = [
  { slug: 'max-verstappen', code: 'VER', number: 1, firstName: 'Max', lastName: 'Verstappen', countryCode: 'NL', teamSlug: 'red-bull-racing', teamColor: '#0600EF' },
  { slug: 'liam-lawson', code: 'LAW', number: 30, firstName: 'Liam', lastName: 'Lawson', countryCode: 'NZ', teamSlug: 'red-bull-racing', teamColor: '#0600EF' },
  { slug: 'lando-norris', code: 'NOR', number: 4, firstName: 'Lando', lastName: 'Norris', countryCode: 'GB', teamSlug: 'mclaren', teamColor: '#FF8000' },
  { slug: 'oscar-piastri', code: 'PIA', number: 81, firstName: 'Oscar', lastName: 'Piastri', countryCode: 'AU', teamSlug: 'mclaren', teamColor: '#FF8000' },
  { slug: 'charles-leclerc', code: 'LEC', number: 16, firstName: 'Charles', lastName: 'Leclerc', countryCode: 'MC', teamSlug: 'ferrari', teamColor: '#DC0000' },
  { slug: 'lewis-hamilton', code: 'HAM', number: 44, firstName: 'Lewis', lastName: 'Hamilton', countryCode: 'GB', teamSlug: 'ferrari', teamColor: '#DC0000' },
  { slug: 'george-russell', code: 'RUS', number: 63, firstName: 'George', lastName: 'Russell', countryCode: 'GB', teamSlug: 'mercedes', teamColor: '#00D2BE' },
  { slug: 'kimi-antonelli', code: 'ANT', number: 12, firstName: 'Kimi', lastName: 'Antonelli', countryCode: 'IT', teamSlug: 'mercedes', teamColor: '#00D2BE' },
  { slug: 'fernando-alonso', code: 'ALO', number: 14, firstName: 'Fernando', lastName: 'Alonso', countryCode: 'ES', teamSlug: 'aston-martin', teamColor: '#006F62' },
  { slug: 'lance-stroll', code: 'STR', number: 18, firstName: 'Lance', lastName: 'Stroll', countryCode: 'CA', teamSlug: 'aston-martin', teamColor: '#006F62' },
  { slug: 'pierre-gasly', code: 'GAS', number: 10, firstName: 'Pierre', lastName: 'Gasly', countryCode: 'FR', teamSlug: 'alpine', teamColor: '#0090FF' },
  { slug: 'franco-colapinto', code: 'COL', number: 43, firstName: 'Franco', lastName: 'Colapinto', countryCode: 'AR', teamSlug: 'alpine', teamColor: '#0090FF' },
  { slug: 'alex-albon', code: 'ALB', number: 23, firstName: 'Alex', lastName: 'Albon', countryCode: 'TH', teamSlug: 'williams', teamColor: '#005AFF' },
  { slug: 'carlos-sainz', code: 'SAI', number: 55, firstName: 'Carlos', lastName: 'Sainz', countryCode: 'ES', teamSlug: 'williams', teamColor: '#005AFF' },
  { slug: 'yuki-tsunoda', code: 'TSU', number: 22, firstName: 'Yuki', lastName: 'Tsunoda', countryCode: 'JP', teamSlug: 'rb', teamColor: '#1E41FF' },
  { slug: 'isack-hadjar', code: 'HAD', number: 6, firstName: 'Isack', lastName: 'Hadjar', countryCode: 'FR', teamSlug: 'rb', teamColor: '#1E41FF' },
  { slug: 'nico-hulkenberg', code: 'HUL', number: 27, firstName: 'Nico', lastName: 'Hülkenberg', countryCode: 'DE', teamSlug: 'sauber', teamColor: '#900000' },
  { slug: 'gabriel-bortoleto', code: 'BOR', number: 5, firstName: 'Gabriel', lastName: 'Bortoleto', countryCode: 'BR', teamSlug: 'sauber', teamColor: '#900000' },
  { slug: 'esteban-ocon', code: 'OCO', number: 31, firstName: 'Esteban', lastName: 'Ocon', countryCode: 'FR', teamSlug: 'haas', teamColor: '#FFFFFF' },
  { slug: 'oliver-bearman', code: 'BEA', number: 87, firstName: 'Oliver', lastName: 'Bearman', countryCode: 'GB', teamSlug: 'haas', teamColor: '#FFFFFF' },
];
