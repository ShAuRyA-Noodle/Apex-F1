// Map Jolpica raw shapes → @apex/types domain shapes.

import type {
  JolpicaRace,
  JolpicaDriver,
  JolpicaConstructor,
  JolpicaDriverStandingEntry,
  JolpicaConstructorStandingEntry,
  JolpicaResultEntry,
} from './types';

function isoFromDateTime(date: string, time?: string) {
  if (!date) return '';
  if (!time) return `${date}T00:00:00Z`;
  // Jolpica returns time as "HH:MM:SSZ" or "HH:MM:SS"
  return `${date}T${time.replace(/Z$/, '')}Z`;
}

export interface UiRace {
  slug: string;
  round: number;
  season: number;
  name: string;
  country: string;
  city: string;
  circuitName: string;
  circuitId: string;
  date: string;
  raceStartIso: string;
  sessions: Array<{ kind: string; iso: string }>;
  wikiUrl: string;
  lat: number;
  lon: number;
}

export function mapRace(r: JolpicaRace): UiRace {
  const sessions: UiRace['sessions'] = [];
  if (r.FirstPractice) sessions.push({ kind: 'FP1', iso: isoFromDateTime(r.FirstPractice.date, r.FirstPractice.time) });
  if (r.SecondPractice) sessions.push({ kind: 'FP2', iso: isoFromDateTime(r.SecondPractice.date, r.SecondPractice.time) });
  if (r.ThirdPractice) sessions.push({ kind: 'FP3', iso: isoFromDateTime(r.ThirdPractice.date, r.ThirdPractice.time) });
  if (r.SprintQualifying) sessions.push({ kind: 'SQ', iso: isoFromDateTime(r.SprintQualifying.date, r.SprintQualifying.time) });
  if (r.Sprint) sessions.push({ kind: 'S', iso: isoFromDateTime(r.Sprint.date, r.Sprint.time) });
  if (r.Qualifying) sessions.push({ kind: 'Q', iso: isoFromDateTime(r.Qualifying.date, r.Qualifying.time) });
  sessions.push({ kind: 'R', iso: isoFromDateTime(r.date, r.time) });

  return {
    slug: r.Circuit.circuitId,
    round: Number(r.round),
    season: Number(r.season),
    name: r.raceName,
    country: r.Circuit.Location.country,
    city: r.Circuit.Location.locality,
    circuitName: r.Circuit.circuitName,
    circuitId: r.Circuit.circuitId,
    date: r.date,
    raceStartIso: isoFromDateTime(r.date, r.time),
    sessions,
    wikiUrl: r.url,
    lat: Number(r.Circuit.Location.lat),
    lon: Number(r.Circuit.Location.long),
  };
}

export interface UiDriver {
  id: string;
  slug: string;
  code: string;
  number: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  dob: string;
  wikiUrl: string;
}

export function mapDriver(d: JolpicaDriver): UiDriver {
  return {
    id: d.driverId,
    slug: d.driverId,
    code: d.code ?? d.familyName.slice(0, 3).toUpperCase(),
    number: d.permanentNumber ? Number(d.permanentNumber) : null,
    firstName: d.givenName,
    lastName: d.familyName,
    fullName: `${d.givenName} ${d.familyName}`,
    nationality: d.nationality,
    dob: d.dateOfBirth,
    wikiUrl: d.url,
  };
}

export interface UiConstructor {
  id: string;
  slug: string;
  name: string;
  nationality: string;
  wikiUrl: string;
}

export function mapConstructor(c: JolpicaConstructor): UiConstructor {
  return {
    id: c.constructorId,
    slug: c.constructorId,
    name: c.name,
    nationality: c.nationality,
    wikiUrl: c.url,
  };
}

export interface UiDriverStanding {
  position: number;
  points: number;
  wins: number;
  driver: UiDriver;
  constructorName: string;
  constructorSlug: string;
}

export function mapDriverStanding(s: JolpicaDriverStandingEntry): UiDriverStanding {
  const c = s.Constructors[0];
  return {
    position: Number(s.position),
    points: Number(s.points),
    wins: Number(s.wins),
    driver: mapDriver(s.Driver),
    constructorName: c?.name ?? '',
    constructorSlug: c?.constructorId ?? '',
  };
}

export interface UiConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructor: UiConstructor;
}

export function mapConstructorStanding(s: JolpicaConstructorStandingEntry): UiConstructorStanding {
  return {
    position: Number(s.position),
    points: Number(s.points),
    wins: Number(s.wins),
    constructor: mapConstructor(s.Constructor),
  };
}

export interface UiResult {
  position: number;
  positionText: string;
  driver: UiDriver;
  constructor: UiConstructor;
  points: number;
  grid: number;
  laps: number;
  status: string;
  time?: string;
  fastestLap?: { rank: number; lap: number; time: string };
}

export function mapResult(r: JolpicaResultEntry): UiResult {
  return {
    position: Number(r.position),
    positionText: r.positionText,
    driver: mapDriver(r.Driver),
    constructor: mapConstructor(r.Constructor),
    points: Number(r.points),
    grid: Number(r.grid),
    laps: Number(r.laps),
    status: r.status,
    time: r.Time?.time,
    fastestLap: r.FastestLap
      ? { rank: Number(r.FastestLap.rank), lap: Number(r.FastestLap.lap), time: r.FastestLap.Time.time }
      : undefined,
  };
}
