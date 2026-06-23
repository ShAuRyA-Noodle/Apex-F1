import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Give back · Help an animal',
  description:
    'Apex is free, independent, and ad-free. No tip jar. If it earned a smile, do one kind thing for an animal near you · feed a stray, back a shelter, support a rescue · and tag the creator.',
};

const CREATOR_X = 'https://x.com/ShAuRyANoodle';
const CREATOR_LINKEDIN = 'https://www.linkedin.com/in/shaurya-punj-2287513b3/';

const WAYS = [
  {
    icon: 'pets',
    title: 'Feed a stray',
    body: `A handful of food. A bowl of water on a hot day. The smallest thing turns a street dog or cat's whole afternoon around.`,
  },
  {
    icon: 'home_health',
    title: 'Back a shelter',
    body: `Donate, foster, or give an hour to a local shelter or rescue. Old blankets and an afternoon count for more than money.`,
  },
  {
    icon: 'volunteer_activism',
    title: 'Rescue & adopt',
    body: `Report an injured animal, drive one to a vet, or adopt instead of buying. One rescue is one whole life.`,
  },
];

export default function SupportPage() {
  return (
    <main className="apex-container py-24 md:py-32">
      <p className="font-data text-[12px] tracking-[0.22em] text-telemetry-red">
        GIVE BACK · NO TIP JAR
      </p>
      <h1
        className="mt-6 font-display font-extrabold uppercase leading-[0.95] tracking-[-0.04em] text-on-background"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
      >
        Don&apos;t pay me.
        <br />
        Feed a stray.
      </h1>

      <p className="mt-10 max-w-3xl font-editorial text-[20px] leading-[1.6] text-on-surface-variant">
        Apex is built and paid for by one person · no ads, no paywall, no team money, and no tip jar.
        If the live ticker, the archive, or a deep dive earned a smile, here&apos;s the only thing I&apos;ll
        ever ask: go do one kind thing for an animal near you. Then tag me · I genuinely want to see it.
      </p>

      <p className="mt-6 max-w-3xl text-[16px] leading-[1.6] text-on-surface-variant">
        I&apos;m an animal lover before I&apos;m anything else. The best currency this site could ever
        earn isn&apos;t money in an account · it&apos;s a stray that got fed, a shelter that got an hour,
        a life that got rescued.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
        {WAYS.map((w) => (
          <div
            key={w.title}
            className="border border-outline-variant/40 bg-surface-container-low p-6 transition-colors hover:border-telemetry-red/60"
          >
            <span className="material-symbols-outlined text-[30px] text-telemetry-red">{w.icon}</span>
            <div className="mt-4 font-display text-2xl font-extrabold text-on-background">{w.title}</div>
            <p className="mt-3 text-[15px] leading-[1.55] text-on-surface-variant">{w.body}</p>
          </div>
        ))}
      </div>

      {/* Tag me */}
      <div className="mt-16 border-t border-outline-variant/30 pt-12">
        <h3 className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
          DID A GOOD DEED? TAG ME
        </h3>
        <p className="mt-4 max-w-2xl text-[16px] leading-[1.6] text-on-surface-variant">
          Post the stray you fed or the shelter you helped and tag me · it makes my whole week, and it
          nudges the next person to do the same. Every link is in the footer too.
        </p>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <a
            href={CREATOR_X}
            target="_blank"
            rel="noopener noreferrer me"
            className="group inline-flex items-center gap-3 border border-on-background bg-on-background px-6 py-4 transition-colors hover:border-telemetry-red hover:bg-telemetry-red"
          >
            <span className="material-symbols-outlined text-[20px] text-background transition-colors group-hover:text-on-background">
              tag
            </span>
            <span className="font-data text-[13px] tracking-[0.18em] text-background transition-colors group-hover:text-on-background">
              TAG ME ON X
            </span>
          </a>
          <a
            href={CREATOR_LINKEDIN}
            target="_blank"
            rel="noopener noreferrer me"
            className="inline-flex items-center gap-3 border border-outline-variant px-6 py-4 text-on-background transition-colors hover:border-telemetry-red hover:text-telemetry-red"
          >
            <span className="material-symbols-outlined text-[20px]">tag</span>
            <span className="font-data text-[13px] tracking-[0.18em]">TAG ME ON LINKEDIN</span>
          </a>
        </div>
      </div>

      {/* Why */}
      <div className="mt-16 grid grid-cols-1 gap-10 border-t border-outline-variant/30 pt-12 md:grid-cols-2">
        <div>
          <h3 className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">WHY NO MONEY</h3>
          <p className="mt-4 text-[15px] leading-[1.6] text-on-surface-variant">
            Apex runs on free tiers and a lot of nights. It doesn&apos;t need your money to survive · it
            needs you to be a little kinder than yesterday. That&apos;s a trade I&apos;ll take every
            single time.
          </p>
        </div>
        <div>
          <h3 className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
            WHAT APEX NEVER TAKES
          </h3>
          <ul className="mt-4 space-y-2 text-[15px] leading-[1.55] text-on-surface-variant">
            <li>· Team / constructor sponsorships</li>
            <li>· FOM / FIA licensing money</li>
            <li>· Behavioural ads or tracker revenue</li>
            <li>· Subscriptions for things that should be free</li>
          </ul>
        </div>
      </div>

      <div className="mt-16 text-[14px] text-on-surface-variant">
        Just here for the racing? Perfect. Read the{' '}
        <Link href="/results/archive" className="text-telemetry-red underline underline-offset-4">
          archive
        </Link>{' '}
        or meet the{' '}
        <Link href="/about" className="text-telemetry-red underline underline-offset-4">
          person behind Apex
        </Link>
        .
      </div>
    </main>
  );
}
