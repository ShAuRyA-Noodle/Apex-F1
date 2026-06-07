import { grid2026 } from './drivers';
import { teams2026 } from './teams';

export const driverStandings2026 = [
  { pos: 1, slug: 'max-verstappen', points: 217, wins: 5 },
  { pos: 2, slug: 'lando-norris', points: 198, wins: 3 },
  { pos: 3, slug: 'oscar-piastri', points: 174, wins: 1 },
  { pos: 4, slug: 'charles-leclerc', points: 152, wins: 1 },
  { pos: 5, slug: 'george-russell', points: 138, wins: 0 },
  { pos: 6, slug: 'lewis-hamilton', points: 121, wins: 0 },
  { pos: 7, slug: 'kimi-antonelli', points: 96, wins: 0 },
  { pos: 8, slug: 'fernando-alonso', points: 67, wins: 0 },
  { pos: 9, slug: 'carlos-sainz', points: 54, wins: 0 },
  { pos: 10, slug: 'alex-albon', points: 41, wins: 0 },
].map((row) => ({
  ...row,
  driver: grid2026.find((d) => d.slug === row.slug)!,
}));

export const teamStandings2026 = [
  { pos: 1, slug: 'red-bull-racing', points: 257, wins: 5 },
  { pos: 2, slug: 'mclaren', points: 372, wins: 4 },
  { pos: 3, slug: 'ferrari', points: 273, wins: 1 },
  { pos: 4, slug: 'mercedes', points: 234, wins: 0 },
  { pos: 5, slug: 'aston-martin', points: 89, wins: 0 },
  { pos: 6, slug: 'williams', points: 95, wins: 0 },
  { pos: 7, slug: 'alpine', points: 42, wins: 0 },
  { pos: 8, slug: 'rb', points: 38, wins: 0 },
  { pos: 9, slug: 'sauber', points: 24, wins: 0 },
  { pos: 10, slug: 'haas', points: 31, wins: 0 },
].map((row) => ({
  ...row,
  team: teams2026.find((t) => t.slug === row.slug)!,
}));
