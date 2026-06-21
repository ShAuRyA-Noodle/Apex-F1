// Wikidata SPARQL client — public, no auth.
// Doc: https://query.wikidata.org/sparql

const ENDPOINT = 'https://query.wikidata.org/sparql';

export interface WikidataDriverFacts {
  qid?: string;
  givenName?: string;
  familyName?: string;
  dob?: string;
  pob?: string;
  height?: number;
  image?: string;
  signature?: string;
  twitter?: string;
  instagram?: string;
}

interface SparqlBinding<K extends string> {
  results: { bindings: Array<Record<K, { value: string }>> };
}

async function sparql<T extends Record<string, string>>(
  query: string,
  opts: { revalidate?: number } = {},
): Promise<T[]> {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'Apex/0.1 (https://github.com/ShAuRyA-Noodle/Apex-F1; hello@apex.gg)',
      },
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    } as RequestInit);
    if (!res.ok) return [];
    const json = (await res.json()) as SparqlBinding<keyof T & string>;
    return json.results.bindings.map((b) => {
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(b)) {
        row[k] = (v as { value: string }).value;
      }
      return row as T;
    });
  } catch {
    return [];
  }
}

/**
 * Find a Wikidata entity for a Formula 1 driver by full name + nationality.
 * Filters to drivers with sport = Formula One (Q1968).
 */
export async function getDriverFactsFromWikidata(
  fullName: string,
  opts: { revalidate?: number } = {},
): Promise<WikidataDriverFacts | null> {
  const escaped = fullName.replace(/"/g, '\\"');
  const query = `
SELECT ?driver ?dob ?pobLabel ?height ?image ?signature WHERE {
  ?driver wdt:P31 wd:Q5 .
  ?driver rdfs:label "${escaped}"@en .
  ?driver wdt:P641 wd:Q1968 .
  OPTIONAL { ?driver wdt:P569 ?dob . }
  OPTIONAL { ?driver wdt:P19 ?pob . ?pob rdfs:label ?pobLabel . FILTER(LANG(?pobLabel) = "en") }
  OPTIONAL { ?driver wdt:P2048 ?height . }
  OPTIONAL { ?driver wdt:P18 ?image . }
  OPTIONAL { ?driver wdt:P109 ?signature . }
}
LIMIT 1`;
  const rows = await sparql<{ driver: string; dob?: string; pobLabel?: string; height?: string; image?: string; signature?: string }>(
    query,
    { revalidate: opts.revalidate ?? 86400 },
  );
  const row = rows[0];
  if (!row) return null;
  const qid = row.driver.split('/').pop();
  return {
    qid,
    dob: row.dob,
    pob: row.pobLabel,
    height: row.height ? Number(row.height) : undefined,
    image: row.image,
    signature: row.signature,
  };
}
