/**
 * Constructors' Championship (WCC) counts across F1 history, through 2025.
 * This is verified historical fact that changes at most once a year, so a
 * maintained map is the right call over 68 live Jolpica standings calls per
 * render. Keyed by Jolpica constructorId. Teams not listed have 0 WCC titles.
 */
export const CONSTRUCTOR_TITLES: Record<string, number> = {
  ferrari: 16,
  mclaren: 9,
  williams: 9,
  mercedes: 8,
  red_bull: 6,
  team_lotus: 7,
  renault: 2,
  cooper: 2,
  brabham: 2,
  benetton: 1,
  tyrrell: 1,
  matra: 1,
  brawn: 1,
  vanwall: 1,
  brm: 1,
};

export function constructorTitles(constructorId: string): number | null {
  return CONSTRUCTOR_TITLES[constructorId] ?? null;
}
