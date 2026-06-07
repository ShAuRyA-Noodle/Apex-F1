import Link from 'next/link';
import { sideRail } from '@/lib/fixtures/articles';

export function HeroRail() {
  return (
    <section className="border-y border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-data text-telemetry-red">FROM THE DESK</h2>
          <Link
            href="/latest"
            className="text-data text-on-surface-variant transition-colors hover:text-on-background"
          >
            ALL STORIES →
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-5">
          {sideRail.map((a) => (
            <li key={a.slug} className="bg-background">
              <Link
                href={`/latest/article/${a.slug}`}
                className="group flex h-full flex-col bg-background p-4 transition-colors hover:bg-surface-container-low md:p-5"
              >
                <div className="relative mb-4 aspect-[16/10] overflow-hidden bg-surface-container-high">
                  <img
                    src={a.heroImageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="text-data mb-2 text-telemetry-red">{a.section}</div>
                <h3 className="line-clamp-3 font-headline text-base text-on-background md:text-lg">
                  {a.title}
                </h3>
                <div className="mt-auto pt-4 text-xs uppercase tracking-[0.18em] text-outline">
                  {a.authorName} · {a.readTimeMinutes} min
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
