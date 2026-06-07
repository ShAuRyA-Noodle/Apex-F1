import Link from 'next/link';
import { editorsPicks } from '@/lib/fixtures/articles';

// Asymmetric editorial grid: feature card 2-col, regular 1-col.
export function EditorsPicks() {
  const [feature, ...rest] = editorsPicks;
  if (!feature) return null;
  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">EDITORS&apos; PICKS</h2>
            <p className="mt-2 font-editorial text-3xl text-on-background md:text-4xl">
              Long reads, deep cuts, paddock-corner reporting
            </p>
          </div>
          <Link href="/latest" className="text-data text-on-surface-variant hover:text-on-background">
            MORE →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <Link
            href={`/latest/article/${feature.slug}`}
            className="group col-span-1 row-span-2 block md:col-span-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-container-high md:aspect-[16/10]">
              <img
                src={feature.heroImageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <span className="text-data text-telemetry-red">{feature.section}</span>
                <h3 className="mt-3 font-headline text-2xl text-on-background md:text-4xl">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-2xl line-clamp-2 font-editorial text-base text-on-surface-variant md:text-lg">
                  {feature.dek}
                </p>
              </div>
            </div>
          </Link>

          {rest.slice(0, 4).map((a) => (
            <Link
              key={a.slug}
              href={`/latest/article/${a.slug}`}
              className="group flex flex-col gap-3"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high">
                <img
                  src={a.heroImageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <span className="text-data text-telemetry-red">{a.section}</span>
              <h3 className="line-clamp-3 font-headline text-base text-on-background md:text-lg">
                {a.title}
              </h3>
              <span className="text-xs uppercase tracking-[0.18em] text-outline">
                {a.authorName} · {a.readTimeMinutes} min
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
