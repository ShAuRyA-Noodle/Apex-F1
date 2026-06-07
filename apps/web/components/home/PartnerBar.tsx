// Per PID §3.1 & §25 — only show partner logos we actually have license for.
// Phase A: render a clean "Independent" badge + reciprocal community partners.

export function PartnerBar() {
  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin">
        <div className="flex flex-col items-center gap-6 text-center">
          <h3 className="text-data text-outline">INDEPENDENT · UNOFFICIAL · ORIGINAL EDITORIAL</h3>
          <p className="max-w-3xl font-editorial text-base text-on-surface-variant md:text-lg">
            Apex is built by fans, for fans. We are not affiliated with Formula 1, FIA, FOM, or any
            team. Data is sourced from public APIs (Jolpica, OpenF1, Wikidata). Editorial is
            original. Logos appear here only when licensed.
          </p>
        </div>
      </div>
    </section>
  );
}
