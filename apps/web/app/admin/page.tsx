import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Apex editorial CMS · internal use.',
  robots: { index: false, follow: false },
};

export default function AdminHome() {
  const dbConfigured = Boolean(process.env.DATABASE_URL);
  const authConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE);

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <span className="text-data text-telemetry-red">APEX · ADMIN</span>
        <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Editorial console
        </h1>
        <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant">
          Internal-only. Auth-gated once SUPABASE_SERVICE_ROLE is provisioned.
        </p>
      </header>

      <section className="mt-12 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-3">
        <Cell
          ok={dbConfigured}
          label="DATABASE"
          status={dbConfigured ? 'CONNECTED' : 'NOT PROVISIONED'}
          hint={dbConfigured ? 'Supabase Postgres reachable.' : 'Set DATABASE_URL in .env.local.'}
        />
        <Cell
          ok={authConfigured}
          label="AUTH"
          status={authConfigured ? 'CONFIGURED' : 'NOT PROVISIONED'}
          hint={authConfigured ? 'Supabase Auth role-gated.' : 'Set SUPABASE_URL + SUPABASE_SERVICE_ROLE.'}
        />
        <Cell
          ok
          label="API"
          status="LIVE"
          hint="Jolpica + OpenF1 + Wikidata + RSS aggregator all up."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-data text-telemetry-red">SECTIONS</h2>
        <ul className="mt-6 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
          <Tile
            href="/admin/articles"
            title="Articles"
            desc="Write + publish editorial. TipTap editor with race / driver / team tagging."
          />
          <li className="bg-background p-6 opacity-60">
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-lg text-on-background">Ingestion runs</h3>
              <span className="border border-outline-variant/60 px-2 py-0.5 text-data text-[10px] text-outline">
                COMING SOON
              </span>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">
              Worker run audit log. Re-run any failed job. Ships with Phase C Supabase wiring.
            </p>
          </li>
        </ul>
      </section>

      <p className="mt-12 text-xs text-outline">
        Phase B Wave 4 ships this admin shell. Phase C wires Supabase Auth role-gating + RLS
        policies before /admin/* opens publicly.
      </p>
    </article>
  );
}

function Cell({
  ok,
  label,
  status,
  hint,
}: {
  ok: boolean;
  label: string;
  status: string;
  hint: string;
}) {
  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="text-data text-outline">{label}</span>
        <span className={`text-data ${ok ? 'text-on-background' : 'text-telemetry-red'}`}>
          {ok ? '● OK' : '● PENDING'}
        </span>
      </div>
      <p className="mt-3 font-headline text-base text-on-background md:text-lg">{status}</p>
      <p className="mt-2 text-xs text-on-surface-variant">{hint}</p>
    </div>
  );
}

function Tile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <li className="bg-background">
      <Link
        href={href}
        className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-surface-container-low"
      >
        <h3 className="font-headline text-xl text-on-background md:text-2xl">{title}</h3>
        <p className="flex-1 text-sm text-on-surface-variant">{desc}</p>
        <span className="text-data text-outline transition-colors group-hover:text-telemetry-red">
          OPEN →
        </span>
      </Link>
    </li>
  );
}
