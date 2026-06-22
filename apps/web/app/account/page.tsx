import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in to Apex or create an account.',
};

interface SearchProps {
  searchParams: Promise<{ signup?: string }>;
}

export default async function AccountPage({ searchParams }: SearchProps) {
  const { signup } = await searchParams;
  const isSignup = signup === '1';

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-24 md:px-grid-margin md:py-32">
      <header>
        <span className="text-data text-telemetry-red">
          {isSignup ? 'CREATE · ACCOUNT' : 'SIGN IN'}
        </span>
        <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          {isSignup ? 'Build your Apex profile.' : 'Welcome back.'}
        </h1>
        <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-2xl">
          Accounts go live alongside Apex+ in Phase C. Until then, follow Apex
          through the Race Week Briefing newsletter. Same intel, same
          editorial voice, delivered before lights out every race weekend.
        </p>
      </header>

      <section className="mt-12 border border-outline-variant/40 p-8 md:p-10">
        <div className="grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-3">
          <Status label="MAGIC LINK AUTH" value="PENDING" hint="Supabase Auth + Resend OTP wires in Phase C." />
          <Status label="GOOGLE OAUTH" value="PENDING" hint="Supabase OAuth callback route landing M9-M12." />
          <Status label="APPLE OAUTH" value="PENDING" hint="Apple Developer account required first." />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/newsletter"
            className="bg-telemetry-red px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
          >
            Join the newsletter
          </Link>
          <Link
            href="/membership"
            className="border border-outline-variant px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
          >
            See Apex+
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-data text-telemetry-red">WHAT ACCOUNTS WILL UNLOCK</h2>
        <ul className="mt-6 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
          <Cell title="Saved articles + follows" body="Tap any driver, team, or race to bookmark. Per-entity push when news drops." />
          <Cell title="Grid Predict streaks" body="Per-race picks persist to your account. Season-long leaderboard with friends." />
          <Cell title="Race-day push" body="Lights out reminder + qualifying surprises in your timezone, never spam." />
          <Cell title="Apex+ benefits" body="Founding-member offer activates once auth ships, $29 lifetime cap 1000." />
        </ul>
      </section>
    </article>
  );
}

function Status({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-data text-outline">{label}</span>
        <span className="text-data text-telemetry-red">● {value}</span>
      </div>
      <p className="mt-3 text-xs text-on-surface-variant">{hint}</p>
    </div>
  );
}

function Cell({ title, body }: { title: string; body: string }) {
  return (
    <li className="bg-background p-6 md:p-7">
      <h3 className="font-headline text-lg text-on-background md:text-xl">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
    </li>
  );
}
