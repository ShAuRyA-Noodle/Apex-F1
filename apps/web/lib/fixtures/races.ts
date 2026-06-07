// Phase-A mock data. Replaced by Jolpica + OpenF1 ingest in Phase B.
// Shape mirrors @apex/types/Race.

export type TickerRace = {
  slug: string;
  round: number;
  season: number;
  country: string;
  shortName: string;
  status: 'completed' | 'live' | 'upcoming';
  dateStart: string;
};

export const upcomingTickerRaces: TickerRace[] = [
  {
    slug: 'monaco',
    round: 8,
    season: 2026,
    country: 'Monaco',
    shortName: 'Monaco Grand Prix',
    status: 'completed',
    dateStart: '2026-05-24T13:00:00Z',
  },
  {
    slug: 'spain',
    round: 9,
    season: 2026,
    country: 'Spain',
    shortName: 'Spanish Grand Prix',
    status: 'upcoming',
    dateStart: '2026-06-14T13:00:00Z',
  },
  {
    slug: 'canada',
    round: 10,
    season: 2026,
    country: 'Canada',
    shortName: 'Canadian Grand Prix',
    status: 'upcoming',
    dateStart: '2026-06-28T18:00:00Z',
  },
  {
    slug: 'austria',
    round: 11,
    season: 2026,
    country: 'Austria',
    shortName: 'Austrian Grand Prix',
    status: 'upcoming',
    dateStart: '2026-07-05T13:00:00Z',
  },
];

export type FullRace = {
  slug: string;
  round: number;
  season: number;
  officialName: string;
  shortName: string;
  country: string;
  city: string;
  circuit: string;
  dateStart: string;
  dateEnd: string;
  isSprint: boolean;
  status: 'completed' | 'live' | 'upcoming';
  heroImageUrl: string;
};

export const seasonRaces2026: FullRace[] = [
  {
    slug: 'bahrain',
    round: 1,
    season: 2026,
    officialName: 'Formula 1 Gulf Air Bahrain Grand Prix 2026',
    shortName: 'Bahrain',
    country: 'Bahrain',
    city: 'Sakhir',
    circuit: 'Bahrain International Circuit',
    dateStart: '2026-03-06',
    dateEnd: '2026-03-08',
    isSprint: false,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1583500178690-f7fd6c5f7f9d?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'saudi-arabia',
    round: 2,
    season: 2026,
    officialName: 'Formula 1 STC Saudi Arabian Grand Prix 2026',
    shortName: 'Saudi Arabia',
    country: 'Saudi Arabia',
    city: 'Jeddah',
    circuit: 'Jeddah Corniche Circuit',
    dateStart: '2026-03-20',
    dateEnd: '2026-03-22',
    isSprint: false,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'australia',
    round: 3,
    season: 2026,
    officialName: 'Formula 1 Australian Grand Prix 2026',
    shortName: 'Australia',
    country: 'Australia',
    city: 'Melbourne',
    circuit: 'Albert Park Circuit',
    dateStart: '2026-04-03',
    dateEnd: '2026-04-05',
    isSprint: false,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1597008641621-cefce8eccb38?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'japan',
    round: 4,
    season: 2026,
    officialName: 'Formula 1 Lenovo Japanese Grand Prix 2026',
    shortName: 'Japan',
    country: 'Japan',
    city: 'Suzuka',
    circuit: 'Suzuka International Racing Course',
    dateStart: '2026-04-17',
    dateEnd: '2026-04-19',
    isSprint: false,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'china',
    round: 5,
    season: 2026,
    officialName: 'Formula 1 Heineken Chinese Grand Prix 2026',
    shortName: 'China',
    country: 'China',
    city: 'Shanghai',
    circuit: 'Shanghai International Circuit',
    dateStart: '2026-05-01',
    dateEnd: '2026-05-03',
    isSprint: true,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1583900985737-6d0495555783?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'miami',
    round: 6,
    season: 2026,
    officialName: 'Formula 1 Crypto.com Miami Grand Prix 2026',
    shortName: 'Miami',
    country: 'USA',
    city: 'Miami',
    circuit: 'Miami International Autodrome',
    dateStart: '2026-05-08',
    dateEnd: '2026-05-10',
    isSprint: true,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1530841344095-502c5826db0e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'emilia-romagna',
    round: 7,
    season: 2026,
    officialName: 'Formula 1 Gran Premio dell’Emilia-Romagna 2026',
    shortName: 'Imola',
    country: 'Italy',
    city: 'Imola',
    circuit: 'Autodromo Enzo e Dino Ferrari',
    dateStart: '2026-05-15',
    dateEnd: '2026-05-17',
    isSprint: false,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1571167379892-32a51eb53f54?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'monaco',
    round: 8,
    season: 2026,
    officialName: 'Formula 1 Grand Prix de Monaco 2026',
    shortName: 'Monaco',
    country: 'Monaco',
    city: 'Monte Carlo',
    circuit: 'Circuit de Monaco',
    dateStart: '2026-05-22',
    dateEnd: '2026-05-24',
    isSprint: false,
    status: 'completed',
    heroImageUrl:
      'https://images.unsplash.com/photo-1530546171585-c11dab3e5cce?auto=format&fit=crop&w=1600&q=80',
  },
  {
    slug: 'spain',
    round: 9,
    season: 2026,
    officialName: 'Formula 1 Aramco Gran Premio de España 2026',
    shortName: 'Spain',
    country: 'Spain',
    city: 'Barcelona',
    circuit: 'Circuit de Barcelona-Catalunya',
    dateStart: '2026-06-13',
    dateEnd: '2026-06-15',
    isSprint: false,
    status: 'upcoming',
    heroImageUrl:
      'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1600&q=80',
  },
];
