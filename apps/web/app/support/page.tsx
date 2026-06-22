import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support Apex',
  description:
    'Apex is independent and ad-free. If the work is useful, keep the lights on with a one-off tip through Ko-fi or Buy Me a Coffee.',
};

// Both Ko-fi and Buy Me a Coffee act as the merchant of record. They hold the
// tip, settle to the recipient via PayPal / Stripe Express, and the supporter
// only ever sees a hosted checkout — no bank details are ever exposed to the
// site. Set NEXT_PUBLIC_TIP_JAR_KOFI / NEXT_PUBLIC_TIP_JAR_BMC in env once the
// handles are claimed; the placeholders below land on the Ko-fi / BMC signup
// flows so the buttons never dead-link in the meantime.
const KOFI_HANDLE = process.env.NEXT_PUBLIC_TIP_JAR_KOFI ?? '';
const BMC_HANDLE = process.env.NEXT_PUBLIC_TIP_JAR_BMC ?? '';

const KOFI_URL = KOFI_HANDLE ? `https://ko-fi.com/${KOFI_HANDLE}` : 'https://ko-fi.com';
const BMC_URL = BMC_HANDLE
  ? `https://www.buymeacoffee.com/${BMC_HANDLE}`
  : 'https://www.buymeacoffee.com';

const TIERS = [
  {
    amount: '$3',
    label: 'Espresso',
    helper: 'Single shot of fuel for one race weekend.',
  },
  {
    amount: '$8',
    label: 'Long black',
    helper: 'Pays the YouTube API + RSS proxies for a month.',
  },
  {
    amount: '$20',
    label: 'Pit crew',
    helper: 'Keeps the Hugging Face GPU credits alive.',
  },
];

export default function SupportPage() {
  const handlesSet = Boolean(KOFI_HANDLE || BMC_HANDLE);

  return (
    <main className="apex-container py-24 md:py-32">
      <p className="font-data text-[12px] tracking-[0.22em] text-telemetry-red">
        TIP JAR · INDEPENDENT
      </p>
      <h1
        className="mt-6 font-display font-extrabold uppercase leading-[0.95] tracking-[-0.04em] text-on-background"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
      >
        Buy the pit
        <br />
        crew a coffee.
      </h1>

      <p className="mt-10 max-w-3xl font-editorial text-[20px] leading-[1.6] text-on-surface-variant">
        Apex is built and paid for by one person. No ads. No team
        sponsorships. No paywall. If the live ticker, the archive, or a deep
        dive helped you out, a one-off tip keeps the API quota lit and the
        servers warm.
      </p>

      <p className="mt-6 max-w-3xl text-[16px] leading-[1.6] text-on-surface-variant">
        Tips run through Ko-fi or Buy Me a Coffee. Both act as the merchant of
        record · they handle the checkout, the card, and the payout. Apex
        never sees your card number or bank account, and we never store one.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.label}
            className="border border-outline-variant/40 bg-surface-container-low p-6"
          >
            <div className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
              {tier.label.toUpperCase()}
            </div>
            <div className="mt-3 font-display text-5xl font-extrabold text-on-background">
              {tier.amount}
            </div>
            <p className="mt-3 text-[15px] leading-[1.5] text-on-surface-variant">
              {tier.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-start gap-4 md:flex-row md:items-center">
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 border border-on-background bg-on-background px-6 py-4 transition-colors hover:bg-telemetry-red hover:border-telemetry-red hover:text-on-background"
        >
          <span className="material-symbols-outlined text-[20px] text-background">
            local_cafe
          </span>
          <span className="font-data text-[13px] tracking-[0.18em] text-background">
            TIP ON KO-FI
          </span>
        </a>
        <a
          href={BMC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 border border-outline-variant px-6 py-4 transition-colors hover:border-telemetry-red hover:text-telemetry-red"
        >
          <span className="material-symbols-outlined text-[20px] text-on-background">
            coffee
          </span>
          <span className="font-data text-[13px] tracking-[0.18em] text-on-background">
            BUY ME A COFFEE
          </span>
        </a>
      </div>

      {!handlesSet && (
        <div className="mt-10 max-w-3xl border-l-2 border-telemetry-red/70 bg-surface-container-low/40 p-5">
          <p className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
            OPERATOR NOTE
          </p>
          <p className="mt-2 text-[14px] leading-[1.55] text-on-surface-variant">
            Tip jar handles are not configured yet. Set
            {' '}
            <code className="font-data text-[12px] text-on-background">
              NEXT_PUBLIC_TIP_JAR_KOFI
            </code>{' '}
            and / or{' '}
            <code className="font-data text-[12px] text-on-background">
              NEXT_PUBLIC_TIP_JAR_BMC
            </code>{' '}
            in <code className="font-data text-[12px] text-on-background">.env.local</code>{' '}
            to wire the buttons to your account. Until then the buttons land on
            the Ko-fi / BMC homepages so the page never dead-links.
          </p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 gap-10 border-t border-outline-variant/30 pt-12 md:grid-cols-2">
        <div>
          <h3 className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
            WHERE THE MONEY GOES
          </h3>
          <ul className="mt-4 space-y-3 text-[15px] leading-[1.55] text-on-surface-variant">
            <li>· YouTube Data API quota top-ups (10k units / day cap)</li>
            <li>· Hugging Face inference credits for hero generation</li>
            <li>· Vercel + Render bandwidth above the hobby tiers</li>
            <li>· Domain renewal + Supabase Pro when traffic crosses free</li>
          </ul>
        </div>
        <div>
          <h3 className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
            WHAT WE DO NOT TAKE
          </h3>
          <ul className="mt-4 space-y-3 text-[15px] leading-[1.55] text-on-surface-variant">
            <li>· Team / constructor sponsorships</li>
            <li>· FOM / FIA licensing money</li>
            <li>· Behavioural advertising or tracker revenue</li>
            <li>· Recurring subscriptions for things that should be free</li>
          </ul>
        </div>
      </div>

      <div className="mt-16 text-[14px] text-on-surface-variant">
        Prefer not to tip? Share the site, file a bug, or just read the
        archive. <Link href="/about" className="text-telemetry-red underline underline-offset-4">More about Apex</Link>.
      </div>
    </main>
  );
}
