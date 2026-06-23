import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleBySlug } from '@apex/db';

export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await getArticleBySlug(slug);
  if (!a) return { title: 'Article not found' };
  return {
    title: a.title,
    description: a.dek ?? a.excerpt ?? undefined,
    openGraph: {
      title: a.title,
      description: a.dek ?? undefined,
      images: a.heroImageUrl ? [a.heroImageUrl] : undefined,
    },
  };
}

export default async function ArticlePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const a = await getArticleBySlug(slug);
  if (!a) notFound();

  const paragraphs = (a.bodyMd ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const published = a.publishedAt
    ? new Date(a.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;

  return (
    <article className="mx-auto w-full max-w-[820px] px-4 py-16 md:py-24">
      <Link
        href="/latest"
        className="group inline-flex items-center gap-2 text-data text-on-surface-variant transition-colors hover:text-on-background"
      >
        <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-1">
          arrow_back
        </span>
        ALL NEWS
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-data">
        <span className="text-telemetry-red">APEX ORIGINAL</span>
        {a.section && (
          <>
            <span className="text-outline">·</span>
            <span className="text-on-surface-variant">{a.section}</span>
          </>
        )}
        {a.readTimeMinutes && (
          <>
            <span className="text-outline">·</span>
            <span className="text-on-surface-variant">{a.readTimeMinutes} MIN READ</span>
          </>
        )}
        {published && (
          <>
            <span className="text-outline">·</span>
            <span className="text-on-surface-variant">{published}</span>
          </>
        )}
      </div>

      <h1 className="mt-5 font-display text-4xl uppercase leading-[1.02] tracking-tight text-on-background md:text-6xl">
        {a.title}
      </h1>
      {a.dek && (
        <p className="mt-6 font-editorial text-xl leading-[1.5] text-on-surface-variant md:text-2xl">
          {a.dek}
        </p>
      )}

      {a.heroImageUrl && (
        <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden bg-surface-container-high">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.heroImageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      )}

      <div className="prose prose-invert mt-12 max-w-none font-headline text-[18px] leading-[1.7] text-on-surface-variant">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
