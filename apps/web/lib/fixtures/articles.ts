export type ArticleFixture = {
  slug: string;
  title: string;
  dek: string;
  type: 'news' | 'feature' | 'analysis' | 'quiz' | 'gallery';
  section: string;
  heroImageUrl: string;
  authorName: string;
  authorSlug: string;
  publishedAt: string;
  readTimeMinutes: number;
  isBreaking?: boolean;
  isPinned?: boolean;
  tags: string[];
};

export const articles: ArticleFixture[] = [
  {
    slug: 'mercedes-w17-floor',
    title: 'How Mercedes engineered the W17 floor for Monaco — and why it broke open the championship',
    dek: 'Inside the aero choices that put Russell on pole and unlocked Hamilton’s long stint.',
    type: 'feature',
    section: 'TECHNICAL',
    heroImageUrl:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1600&q=80',
    authorName: 'A. Marini',
    authorSlug: 'a-marini',
    publishedAt: '2026-05-29T10:00:00Z',
    readTimeMinutes: 9,
    isPinned: true,
    tags: ['mercedes', 'monaco', 'technical'],
  },
  {
    slug: 'piastri-championship-momentum',
    title: 'Piastri’s quiet path to the title — three races that re-wrote McLaren’s strategy',
    dek: 'The number-2 narrative is gone. Piastri’s Q3 deltas tell a different story.',
    type: 'analysis',
    section: 'ANALYSIS',
    heroImageUrl:
      'https://images.unsplash.com/photo-1614026480209-cfeb4dba3f7c?auto=format&fit=crop&w=1200&q=80',
    authorName: 'M. Hassan',
    authorSlug: 'm-hassan',
    publishedAt: '2026-05-29T08:30:00Z',
    readTimeMinutes: 7,
    tags: ['piastri', 'mclaren', 'championship'],
  },
  {
    slug: 'verstappen-radio-leaks',
    title: 'Verstappen’s radio leaks: what Horner won’t say about the Honda transition',
    dek: 'Three engineers, two messages, one constructors’ gap closing fast.',
    type: 'news',
    section: 'BREAKING',
    heroImageUrl:
      'https://images.unsplash.com/photo-1583500178690-f7fd6c5f7f9d?auto=format&fit=crop&w=1200&q=80',
    authorName: 'D. Ortiz',
    authorSlug: 'd-ortiz',
    publishedAt: '2026-05-29T07:15:00Z',
    readTimeMinutes: 5,
    isBreaking: true,
    tags: ['verstappen', 'red-bull', 'honda'],
  },
  {
    slug: 'antonelli-rookie-of-year',
    title: 'Antonelli is the rookie story of 2026 — and Mercedes know it',
    dek: 'Pace deltas to Russell across six tracks reveal a generational driver.',
    type: 'feature',
    section: 'FEATURE',
    heroImageUrl:
      'https://images.unsplash.com/photo-1530841344095-502c5826db0e?auto=format&fit=crop&w=1200&q=80',
    authorName: 'L. Reeve',
    authorSlug: 'l-reeve',
    publishedAt: '2026-05-28T17:00:00Z',
    readTimeMinutes: 11,
    tags: ['antonelli', 'mercedes', 'rookie'],
  },
  {
    slug: 'spain-preview-strategy',
    title: 'Spanish GP preview: what Pirelli’s C2-C3-C4 actually does to undercut windows',
    dek: 'The Barcelona surface is changing. Strategy boards already have.',
    type: 'analysis',
    section: 'STRATEGY',
    heroImageUrl:
      'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80',
    authorName: 'J. Sato',
    authorSlug: 'j-sato',
    publishedAt: '2026-05-28T12:00:00Z',
    readTimeMinutes: 8,
    tags: ['spain', 'strategy', 'pirelli'],
  },
  {
    slug: 'ferrari-pit-stop-record',
    title: 'Ferrari’s 1.86s stop in Monaco wasn’t luck — here’s the new wheel-gun protocol',
    dek: 'Inside a 14-month Maranello pit crew rebuild that quietly leads the paddock.',
    type: 'feature',
    section: 'INSIDE TEAMS',
    heroImageUrl:
      'https://images.unsplash.com/photo-1571167379892-32a51eb53f54?auto=format&fit=crop&w=1200&q=80',
    authorName: 'A. Marini',
    authorSlug: 'a-marini',
    publishedAt: '2026-05-28T09:00:00Z',
    readTimeMinutes: 6,
    tags: ['ferrari', 'pit-crew'],
  },
  {
    slug: 'fia-flexi-wing-clamp',
    title: 'FIA tightens flexi-wing test for Spain — what it means for McLaren and Ferrari',
    dek: 'The new load test is 7.5% more aggressive. Three teams will feel it.',
    type: 'news',
    section: 'REGULATIONS',
    heroImageUrl:
      'https://images.unsplash.com/photo-1614026480209-cfeb4dba3f7c?auto=format&fit=crop&w=1200&q=80',
    authorName: 'D. Ortiz',
    authorSlug: 'd-ortiz',
    publishedAt: '2026-05-27T18:00:00Z',
    readTimeMinutes: 4,
    tags: ['fia', 'regulations'],
  },
  {
    slug: 'haas-points-finish-streak',
    title: 'Haas’s three-race points streak: how Ayao Komatsu is rebuilding the team’s engineering culture',
    dek: 'A team that nearly folded in 2024 is now reliably in Q3. Here is how.',
    type: 'feature',
    section: 'FEATURE',
    heroImageUrl:
      'https://images.unsplash.com/photo-1597008641621-cefce8eccb38?auto=format&fit=crop&w=1200&q=80',
    authorName: 'L. Reeve',
    authorSlug: 'l-reeve',
    publishedAt: '2026-05-27T11:30:00Z',
    readTimeMinutes: 9,
    tags: ['haas', 'komatsu'],
  },
];

export const leadArticle = articles[0]!;
export const sideRail = articles.slice(1, 6);
export const editorsPicks = articles.slice(2, 10);
