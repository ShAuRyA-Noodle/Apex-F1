import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Apex+',
  description:
    'Apex+ — the ad-free, telemetry-replay, full-archive tier. Founding-member offer at launch.',
};

const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: 'block', title: 'Ad-free everywhere', desc: 'Zero programmatic, zero affiliate widgets, zero takeover overlays. Just race-day intelligence.' },
  { icon: 'archive', title: 'Full 1950 → 2026 archive', desc: 'Search any driver, any race, any season. Lap times, qualifying gaps, pit stops, championship math.' },
  { icon: 'analytics', title: 'Ghost Lap telemetry replays', desc: 'Two cars, same lap, side-by-side delta. The thing no fan site does for free.' },
  { icon: 'leaderboard', title: 'Grid Prediction Market', desc: 'Pick 5 questions a race weekend. Build a friends league. Compete for the season title.' },
  { icon: 'notifications_active', title: 'Race-day priority push', desc: 'First-to-know notifications: lights out, qualifying surprises, breaking moves. No noise.' },
  { icon: 'mail', title: 'Apex+ Paddock Memo', desc: 'A subscriber-only second newsletter — long-form Saturday paddock corner.' },
];

export default function MembershipPage() {
  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-20 md:px-grid-margin md:py-32">
          <span className="text-data text-telemetry-red">APEX+</span>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
            Built for the people<br />
            who pause the broadcast.
          </h1>
          <p className="mt-6 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
            Apex stays free for the daily fan. Apex+ is for the diehard — the analyst
            checking gap charts at lap 28, the strategist counting laps to undercut, the
            archivist who wants the entire 76-year championship in one queryable home.
          </p>
        </div>
      </header>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data text-telemetry-red">FOUNDING MEMBER · LIMITED TO 1000</h2>
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                $29 once. Lifetime Apex+.
              </p>
              <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-xl">
                Cover one founder dinner for a year of platform development. Lock in Apex+
                for life. Cap: the first 1000 supporters. After 1000 it becomes
                $4.99/month or $49/year for everyone.
              </p>
            </div>
            <div className="font-data text-[120px] leading-none text-telemetry-red md:text-[200px]">
              $29
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled
              title="Apex+ checkout activates once Stripe is provisioned. Drop your email below to be notified the moment it opens."
              className="cursor-not-allowed border border-outline-variant px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-outline"
            >
              Founding member · launches with Apex+
            </button>
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-2 font-headline text-sm uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
            >
              Get notified
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data text-telemetry-red">WHAT YOU GET</h2>
          <ul className="mt-8 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="bg-background p-6 md:p-8">
                <span className="material-symbols-outlined text-[28px] text-telemetry-red">
                  {f.icon}
                </span>
                <h3 className="mt-4 font-headline text-xl text-on-background md:text-2xl">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm text-on-surface-variant md:text-base">{f.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data text-telemetry-red">FAQ</h2>
          <dl className="mt-8 divide-y divide-outline-variant/40 border-y border-outline-variant/40">
            <Q q="When does Apex+ launch?" a="Phase C (Month 4-6 of the roadmap). Founding-member checkout opens with launch and closes at the 1000th supporter." />
            <Q q="What about regular monthly pricing?" a="After Founding Member: $4.99/month or $49/year. Apex stays free for the casual fan — Apex+ is purely for the diehard." />
            <Q q="Does it replace F1 TV?" a="No. F1 TV is live broadcast you watch. Apex+ is the intelligence layer around the broadcast — pre-race strategy, live timing, in-depth telemetry, post-race archive." />
            <Q q="Is this affiliated with Formula 1 / FIA / FOM?" a="No. Apex is independent and unofficial. Every page has the disclaimer." />
          </dl>
        </div>
      </section>
    </article>
  );
}

function Q({ q, a }: { q: string; a: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 py-6 md:grid-cols-[1fr_2fr]">
      <dt className="font-headline text-lg text-on-background md:text-xl">{q}</dt>
      <dd className="font-editorial text-base text-on-surface-variant md:text-lg">{a}</dd>
    </div>
  );
}
