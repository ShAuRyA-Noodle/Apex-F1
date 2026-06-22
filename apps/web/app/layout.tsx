import type { Metadata, Viewport } from 'next';
import { Anybody, Hanken_Grotesk, EB_Garamond, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { LenisProvider } from '@/components/motion/LenisProvider';

/**
 * Self-hosted via next/font — fonts are bundled + served from our own origin
 * (no Google Fonts round-trip, no render-blocking <link>, no layout shift).
 * Each exposes a CSS variable consumed by the --font-* tokens in globals.css.
 */
const anybody = Anybody({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-anybody',
  display: 'swap',
});
const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-hanken',
  display: 'swap',
});
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400'], // Google's EB Garamond has no 300 weight; 400 is the lightest face.
  variable: '--font-garamond',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const fontVars = `${anybody.variable} ${hankenGrotesk.variable} ${ebGaramond.variable} ${jetbrainsMono.variable}`;
import { TopUtilityBar } from '@/components/shell/TopUtilityBar';
import { RaceTickerBar } from '@/components/shell/RaceTickerBar';
import { MegaNavServer } from '@/components/shell/MegaNavServer';
import { BreakingNewsTickerServer } from '@/components/live/BreakingNewsTickerServer';
import { Footer } from '@/components/shell/Footer';
import { CookieConsent } from '@/components/shell/CookieConsent';
import { PosthogScript } from '@/components/shell/PosthogScript';
import { ToastProvider } from '@/components/shell/Toast';
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal';

const SITE = 'Apex';
const DESCRIPTION =
  'Apex · independent Formula 1 fan platform. Schedule, results, drivers, teams, news, video, and live race-day intelligence. Unofficial.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: `${SITE} · Independent Formula 1 fan platform`,
    template: `%s · ${SITE}`,
  },
  description: DESCRIPTION,
  applicationName: SITE,
  authors: [{ name: 'Shaurya Punj', url: 'https://shauryapunj.com' }],
  creator: 'Shaurya Punj',
  publisher: 'Shaurya Punj',
  keywords: ['Formula 1', 'F1', 'Grand Prix', 'live timing', 'race results', 'driver standings'],
  openGraph: {
    type: 'website',
    siteName: SITE,
    title: `${SITE} · Independent Formula 1 fan platform`,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE,
    description: DESCRIPTION,
    creator: '@ShAuRyANoodle',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#141313',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${fontVars}`}>
      <head>
        {/* Text fonts are self-hosted via next/font (above). Only the Material
            Symbols variable icon font still loads from Google — next/font does
            not support its variable axes, so the CDN stylesheet stays. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="antialiased">
        <LenisProvider>
          <ToastProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:bg-telemetry-red focus:px-4 focus:py-2 focus:text-on-background"
            >
              Skip to content
            </a>
            <TopUtilityBar />
            <MegaNavServer />
            <RaceTickerBar />
            <BreakingNewsTickerServer />
            <main id="main" className="relative">
              {children}
            </main>
            <Footer />
            <CookieConsent />
            <VideoPlayerModal />
          </ToastProvider>
        </LenisProvider>
        <PosthogScript />
      </body>
    </html>
  );
}
