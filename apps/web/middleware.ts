import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin is unauthenticated scaffolding (no Supabase Auth yet) · only robots.txt
 * was hiding it, so it was publicly reachable. Until a real auth gate lands,
 * block /admin/* entirely in PRODUCTION so the console + article editor are not
 * exposed. It stays open in local/preview dev for building.
 *
 * Replace this with Supabase-Auth role gating once SUPABASE_SERVICE_ROLE is set.
 */
export function middleware(req: NextRequest) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
