import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleEditor } from './editor';

export const metadata: Metadata = {
  title: 'Admin · Articles',
  robots: { index: false, follow: false },
};

export default function AdminArticlesPage() {
  const dbConfigured = Boolean(process.env.DATABASE_URL);

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-grid-margin md:py-16">
      <Link href="/admin" className="text-data text-outline hover:text-on-background">
        ← ADMIN
      </Link>

      <header className="mt-6 flex items-end justify-between gap-4">
        <div>
          <span className="text-data text-telemetry-red">ARTICLES · DRAFT</span>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
            New article
          </h1>
        </div>
        {!dbConfigured && (
          <span className="bg-telemetry-red px-4 py-2 text-data text-on-background">
            DB NOT PROVISIONED
          </span>
        )}
      </header>

      <p className="mt-4 max-w-2xl font-editorial text-base text-on-surface-variant">
        {dbConfigured
          ? 'Compose + Save Draft writes to the article table. Publish flips published_at and triggers revalidation of /latest + the homepage.'
          : 'Editor renders below. Save Draft is disabled until DATABASE_URL is set. Use this shell to validate the editor experience locally.'}
      </p>

      <div className="mt-10">
        <ArticleEditor enabled={dbConfigured} />
      </div>
    </article>
  );
}
