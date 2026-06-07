export const socialPulse = [
  {
    provider: 'instagram' as const,
    handle: '@charles_leclerc',
    excerpt: 'Monaco. Home. Never gets old.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1530546171585-c11dab3e5cce?auto=format&fit=crop&w=800&q=80',
    metric: { kind: 'likes' as const, value: 1_280_000 },
  },
  {
    provider: 'youtube' as const,
    handle: 'Chain Bear',
    excerpt: 'How the W17 floor’s Y250 vortex actually works (10 min)',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
    metric: { kind: 'views' as const, value: 340_000 },
  },
  {
    provider: 'reddit' as const,
    handle: 'r/formula1',
    excerpt: '[POST RACE] 2026 Monaco GP — Megathread',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1614026480209-cfeb4dba3f7c?auto=format&fit=crop&w=800&q=80',
    metric: { kind: 'upvotes' as const, value: 24_700 },
  },
];
