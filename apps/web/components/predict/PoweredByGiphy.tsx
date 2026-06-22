/**
 * PoweredByGiphy
 *
 * Mandatory attribution badge per Giphy's API Terms of Service:
 *   https://developers.giphy.com/branding-guidelines/
 *
 * Quoting their docs: "All applications must clearly display 'Powered By
 * GIPHY' attribution where GIPHY users see the content." Apex renders this
 * pinned to the bottom-right of every surface that displays a Giphy GIF.
 *
 * No image asset is used (their brand kit ships a logo lockup but we render
 * a text-only badge to keep CLS at zero on the predict card). The wording
 * is the load-bearing requirement, not the logo.
 */
export function PoweredByGiphy({
  className = '',
}: {
  className?: string;
}) {
  return (
    <a
      href="https://giphy.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by GIPHY"
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-sm bg-black/55 px-2 py-1 font-data text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm transition-opacity hover:text-white ${className}`}
    >
      <span
        aria-hidden="true"
        className="block h-1.5 w-1.5 rounded-full bg-[#04ff70]"
      />
      Powered by GIPHY
    </a>
  );
}
