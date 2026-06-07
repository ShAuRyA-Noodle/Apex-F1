import Link from 'next/link';

const items = [
  { label: 'Schedule', href: '/schedule', icon: 'calendar_month' },
  { label: 'Standings', href: '/results/2026/drivers', icon: 'leaderboard' },
  { label: 'Drivers', href: '/drivers', icon: 'badge' },
  { label: 'Teams', href: '/teams', icon: 'groups' },
  { label: 'Live timing', href: '/live/timing', icon: 'speed' },
  { label: 'Archive', href: '/results/archive', icon: 'inventory_2' },
];

export function QuickLinks() {
  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-grid-margin">
        <ul className="-mx-2 flex gap-2 overflow-x-auto">
          {items.map((i) => (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                className="group flex items-center gap-2 border border-outline-variant/50 bg-surface-container-low px-4 py-3 transition-colors hover:border-telemetry-red hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px] text-telemetry-red">
                  {i.icon}
                </span>
                <span className="text-sm font-medium uppercase tracking-wide text-on-surface group-hover:text-on-background">
                  {i.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
