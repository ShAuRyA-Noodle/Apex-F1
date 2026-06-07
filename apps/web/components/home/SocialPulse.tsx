import { socialPulse } from '@/lib/fixtures/social';

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const iconMap: Record<string, string> = {
  instagram: 'photo_camera',
  youtube: 'smart_display',
  reddit: 'forum',
  twitter: 'chat',
  tiktok: 'music_note',
};

export function SocialPulse() {
  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin">
        <div className="mb-8">
          <h2 className="text-data text-telemetry-red">SOCIAL PULSE</h2>
          <p className="mt-2 font-editorial text-2xl text-on-background md:text-3xl">
            What the paddock is posting right now
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {socialPulse.map((p, i) => (
            <li
              key={i}
              className="group relative overflow-hidden border border-outline-variant/40 bg-background"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
              <div className="space-y-3 p-4 md:p-5">
                <div className="flex items-center gap-2 text-data text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-telemetry-red">
                    {iconMap[p.provider] ?? 'public'}
                  </span>
                  <span>{p.provider.toUpperCase()}</span>
                  <span className="text-outline">·</span>
                  <span>{p.handle}</span>
                </div>
                <p className="font-headline text-base text-on-background md:text-lg">
                  {p.excerpt}
                </p>
                <div className="text-data text-on-surface-variant">
                  {fmtCount(p.metric.value)} {p.metric.kind.toUpperCase()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
