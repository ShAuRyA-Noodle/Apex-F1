import Link from 'next/link';
import { highlightVideos } from '@/lib/fixtures/videos';

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function HighlightsRail() {
  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">2026 HIGHLIGHTS</h2>
            <p className="mt-2 font-editorial text-2xl text-on-background md:text-3xl">
              Every race. Every key lap.
            </p>
          </div>
          <Link href="/video?rail=highlights" className="text-data text-on-surface-variant hover:text-on-background">
            ALL →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {highlightVideos.slice(0, 4).map((v) => (
            <li key={v.slug}>
              <Link href={`/video/${v.slug}`} className="group block">
                <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="text-data absolute bottom-2 right-2 bg-carbon-black/80 px-2 py-0.5 text-[11px] text-on-background">
                    {fmtDur(v.durationSeconds)}
                  </span>
                </div>
                <h3 className="mt-3 line-clamp-2 font-headline text-sm text-on-background md:text-base">
                  {v.title}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
