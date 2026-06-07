export type VideoFixture = {
  slug: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  durationSeconds: number;
  rail: 'featured' | 'highlights' | 'technical' | 'interviews' | 'bts';
  youtubeId?: string;
};

function s(min: number, sec: number) {
  return min * 60 + sec;
}

export const videos: VideoFixture[] = [
  {
    slug: 'monaco-2026-highlights',
    title: 'Monaco GP 2026 — Race highlights',
    channel: 'Apex Studios',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1530546171585-c11dab3e5cce?auto=format&fit=crop&w=900&q=80',
    durationSeconds: s(3, 41),
    rail: 'featured',
  },
  {
    slug: 'russell-pole-lap-analysis',
    title: 'Russell’s pole lap, sector by sector',
    channel: 'Apex Engineering',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=900&q=80',
    durationSeconds: s(6, 12),
    rail: 'technical',
  },
  {
    slug: 'piastri-interview-post-monaco',
    title: '“I’m not racing for second” — Piastri after Monaco',
    channel: 'Apex Studios',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1614026480209-cfeb4dba3f7c?auto=format&fit=crop&w=900&q=80',
    durationSeconds: s(4, 28),
    rail: 'interviews',
  },
  {
    slug: 'inside-ferrari-pit-rebuild',
    title: 'Inside Ferrari’s pit-crew rebuild — full doc',
    channel: 'Apex Originals',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1571167379892-32a51eb53f54?auto=format&fit=crop&w=900&q=80',
    durationSeconds: s(18, 5),
    rail: 'bts',
  },
  {
    slug: 'verstappen-onboard-radio',
    title: 'Verstappen’s onboard + team radio — final stint',
    channel: 'Apex Engineering',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1583500178690-f7fd6c5f7f9d?auto=format&fit=crop&w=900&q=80',
    durationSeconds: s(8, 51),
    rail: 'highlights',
  },
  {
    slug: 'antonelli-rookie-mini-doc',
    title: 'Antonelli — 18 and ready',
    channel: 'Apex Originals',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1530841344095-502c5826db0e?auto=format&fit=crop&w=900&q=80',
    durationSeconds: s(12, 9),
    rail: 'bts',
  },
];

export const featuredVideos = videos.filter((v) => v.rail !== 'bts').slice(0, 6);
export const highlightVideos = videos.filter((v) => v.rail === 'highlights' || v.rail === 'featured');
