import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { getDb } from './client';
import { article } from './schema';

export interface ApexArticle {
  slug: string;
  title: string;
  dek: string | null;
  excerpt: string | null;
  section: string | null;
  heroImageUrl: string | null;
  bodyMd: string | null;
  readTimeMinutes: number | null;
  publishedAt: Date | null;
}

const COLS = {
  slug: article.slug,
  title: article.title,
  dek: article.dek,
  excerpt: article.excerpt,
  section: article.section,
  heroImageUrl: article.heroImageUrl,
  bodyMd: article.bodyMd,
  readTimeMinutes: article.readTimeMinutes,
  publishedAt: article.publishedAt,
} as const;

/**
 * Latest published Apex original editorial, newest first. Returns [] when the DB
 * is unset or unreachable (CORE RULE #1: never throw, never fabricate) so the
 * homepage / latest surfaces just fall back to the aggregated wire feed.
 */
export async function getPublishedArticles(limit = 6): Promise<ApexArticle[]> {
  if (!process.env['DATABASE_URL']) return [];
  try {
    const db = getDb();
    return await db
      .select(COLS)
      .from(article)
      .where(isNotNull(article.publishedAt))
      .orderBy(desc(article.publishedAt))
      .limit(limit);
  } catch {
    return [];
  }
}

/** A single published article by slug, or null. */
export async function getArticleBySlug(slug: string): Promise<ApexArticle | null> {
  if (!process.env['DATABASE_URL']) return null;
  try {
    const db = getDb();
    const rows = await db
      .select(COLS)
      .from(article)
      .where(and(eq(article.slug, slug), isNotNull(article.publishedAt)))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
