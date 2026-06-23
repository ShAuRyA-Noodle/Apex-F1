// Apex design tokens · Material-You dark, telemetry-grade.
// Ported from the_grid_homepage/code.html legacy Tailwind config and PID §21.
// Source of truth: every color / font / spacing in the production app pulls from here.

export const colors = {
  // Surfaces (Material-You dark)
  background: '#141313',
  surface: '#141313',
  surfaceDim: '#141313',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2b2a2a',
  surfaceContainerHighest: '#353434',
  surfaceBright: '#3a3939',
  surfaceVariant: '#353434',
  surfaceTint: '#c8c6c5',
  inverseSurface: '#e5e2e1',
  inverseOnSurface: '#313030',

  // Brand
  telemetryRed: '#E10600',
  asphaltGray: '#262626',
  carbonBlack: '#0F0F0F',
  prestigeParchment: '#F4F1EA',
  staveLine: 'rgba(255, 255, 255, 0.15)',

  // Primary / secondary / tertiary
  primary: '#c8c6c5',
  primaryContainer: '#0f0f0f',
  primaryFixed: '#e5e2e1',
  primaryFixedDim: '#c8c6c5',
  onPrimary: '#313030',
  onPrimaryContainer: '#7d7b7b',
  onPrimaryFixed: '#1c1b1b',
  onPrimaryFixedVariant: '#474646',
  inversePrimary: '#5f5e5e',

  secondary: '#ffb4a8',
  secondaryContainer: '#e00600',
  secondaryFixed: '#ffdad4',
  secondaryFixedDim: '#ffb4a8',
  onSecondary: '#680200',
  onSecondaryContainer: '#fff1ef',
  onSecondaryFixed: '#410100',
  onSecondaryFixedVariant: '#930300',

  tertiary: '#c9c6c0',
  tertiaryContainer: '#0f0f0b',
  tertiaryFixed: '#e5e2db',
  tertiaryFixedDim: '#c9c6c0',
  onTertiary: '#31312c',
  onTertiaryContainer: '#7d7c76',
  onTertiaryFixed: '#1c1c18',
  onTertiaryFixedVariant: '#474742',

  // Outlines / text
  onBackground: '#e5e2e1',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#c4c7c7',
  outline: '#8e9192',
  outlineVariant: '#444748',

  // Status
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',
} as const;

export const fonts = {
  displayXl: 'Anybody',
  displayXlMobile: 'Anybody',
  headlineLg: 'Anybody',
  bodyMd: 'Hanken Grotesk',
  editorialSerif: 'EB Garamond',
  dataMono: 'JetBrains Mono',
} as const;

export const fontSizes = {
  displayXl: ['84px', { lineHeight: '1.0', letterSpacing: '-0.04em', fontWeight: '800' }],
  displayXlMobile: ['48px', { lineHeight: '1.1', fontWeight: '800' }],
  headlineLg: ['42px', { lineHeight: '1.2', fontWeight: '700' }],
  bodyMd: ['18px', { lineHeight: '1.6', fontWeight: '400' }],
  editorialSerif: ['32px', { lineHeight: '1.4', fontWeight: '300' }],
  dataMono: ['14px', { lineHeight: '1.2', letterSpacing: '0.1em', fontWeight: '500' }],
} as const;

export const spacing = {
  safeArea: '10vw',
  gridGutter: '1.5rem',
  staveGap: '2rem',
  gridMargin: '4rem',
} as const;

export const radius = {
  DEFAULT: '0.25rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export const motion = {
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
  durationFast: '180ms',
  durationDefault: '320ms',
  durationLong: '600ms',
  durationCinematic: '900ms',
} as const;

export type ApexColorKey = keyof typeof colors;
