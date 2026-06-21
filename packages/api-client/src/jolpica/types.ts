// Jolpica F1 (Ergast-compatible) raw response shapes.
// Doc: https://github.com/jolpica/jolpica-f1

export interface JolpicaEnvelope<T> {
  MRData: {
    series: 'f1';
    url: string;
    limit: string;
    offset: string;
    total: string;
  } & T;
}

export interface JolpicaLocation {
  lat: string;
  long: string;
  locality: string;
  country: string;
}

export interface JolpicaCircuit {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: JolpicaLocation;
}

export interface JolpicaSessionTime {
  date: string;
  time?: string;
}

export interface JolpicaRace {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: JolpicaCircuit;
  date: string;
  time?: string;
  FirstPractice?: JolpicaSessionTime;
  SecondPractice?: JolpicaSessionTime;
  ThirdPractice?: JolpicaSessionTime;
  Qualifying?: JolpicaSessionTime;
  Sprint?: JolpicaSessionTime;
  SprintQualifying?: JolpicaSessionTime;
}

export interface JolpicaRaceTableEnvelope {
  RaceTable: {
    season: string;
    Races: JolpicaRace[];
  };
}

export interface JolpicaDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface JolpicaDriverStandingEntry {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
}

export interface JolpicaConstructorStandingEntry {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: JolpicaConstructor;
}

export interface JolpicaStandingsList<T> {
  season: string;
  round: string;
  DriverStandings?: T extends 'driver' ? JolpicaDriverStandingEntry[] : never;
  ConstructorStandings?: T extends 'constructor' ? JolpicaConstructorStandingEntry[] : never;
}

export interface JolpicaDriverStandingsEnvelope {
  StandingsTable: {
    season: string;
    StandingsLists: Array<{
      season: string;
      round: string;
      DriverStandings: JolpicaDriverStandingEntry[];
    }>;
  };
}

export interface JolpicaConstructorStandingsEnvelope {
  StandingsTable: {
    season: string;
    StandingsLists: Array<{
      season: string;
      round: string;
      ConstructorStandings: JolpicaConstructorStandingEntry[];
    }>;
  };
}

export interface JolpicaDriverListEnvelope {
  DriverTable: {
    season?: string;
    Drivers: JolpicaDriver[];
  };
}

export interface JolpicaConstructorListEnvelope {
  ConstructorTable: {
    season?: string;
    Constructors: JolpicaConstructor[];
  };
}

export interface JolpicaResultEntry {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string };
    AverageSpeed?: { units: string; speed: string };
  };
}

export interface JolpicaResultsEnvelope {
  RaceTable: {
    season: string;
    round: string;
    Races: Array<JolpicaRace & { Results: JolpicaResultEntry[] }>;
  };
}
