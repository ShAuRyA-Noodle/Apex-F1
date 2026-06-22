import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LenisProvider } from '@/components/motion/LenisProvider';
import { TopUtilityBar } from '@/components/shell/TopUtilityBar';
import { RaceTickerBar } from '@/components/shell/RaceTickerBar';
import { MegaNav } from '@/components/shell/MegaNav';
import { Footer } from '@/components/shell/Footer';
import { CookieConsent } from '@/components/shell/CookieConsent';
import { PosthogScript } from '@/components/shell/PosthogScript';
import { ToastProvider } from '@/components/shell/Toast';

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
  keywords: ['Formula 1', 'F1', 'Grand Prix', 'live timing', 'race results', 'driver standings'],
  openGraph: {
    type: 'website',
    siteName: SITE,
    title: `${SITE} · Independent Formula 1 fan platform`,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: SITE, description: DESCRIPTION },
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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anybody:wght@700;800&family=EB+Garamond:wght@300&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap"
        />
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
            <MegaNav />
            <RaceTickerBar />
            <main id="main" className="relative">
              {children}
            </main>
            <Footer />
            <CookieConsent />
          </ToastProvider>
        </LenisProvider>
        <PosthogScript />
      </body>
    </html>
  );
}
