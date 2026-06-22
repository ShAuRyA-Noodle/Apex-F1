import type { NextConfig } from 'next';
import path from 'node:path';

/**
 * Apex Next.js config
 * - Suppresses the Next 16 dev indicator (the bottom-left "N" pill + route-compilation dots).
 * - Sub-flags below are belt-and-braces: `devIndicators: false` alone is enough in Next 16,
 *   but explicit `{ buildActivity: false, buildActivityPosition: ... }` keeps older HMR
 *   overlays from sneaking back on minor bumps.
 * - Final safety net lives in `globals.css` (hides `nextjs-portal` + `data-nextjs-toast`).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@apex/ui', '@apex/types', '@apex/api-client'],

  // Hide the bottom-left "N" pill and the route-compilation spinner.
  devIndicators: false,

  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  experimental: {
    optimizePackageImports: ['framer-motion', 'gsap'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
