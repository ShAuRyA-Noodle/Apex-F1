import Link from 'next/link';

const utilityLinks = [
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Archive', href: '/results/archive' },
  { label: 'Apex+', href: '/membership', highlight: true },
  { label: 'Search', href: '/search' },
];

const authLinks = [
  { label: 'Sign in', href: '/account' },
  { label: 'Create account', href: '/account?signup=1' },
];

export function TopUtilityBar() {
  return (
    <div className="hidden border-b border-outline-variant/40 bg-carbon-black/80 backdrop-blur md:block">
      <div className="mx-auto flex h-9 w-full max-w-[1600px] items-center justify-between px-grid-margin">
        <div className="flex items-center gap-1 text-data text-on-surface-variant">
          <span className="text-data text-telemetry-red">●</span>
          <span className="ml-2">APEX · Independent Formula 1 platform</span>
        </div>
        <nav aria-label="Utility" className="flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">
          {utilityLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                l.highlight
                  ? 'text-telemetry-red transition-colors hover:text-on-background'
                  : 'transition-colors hover:text-on-background'
              }
            >
              {l.label}
            </Link>
          ))}
          <span className="h-3 w-px bg-outline-variant/60" />
          {authLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-on-background"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
