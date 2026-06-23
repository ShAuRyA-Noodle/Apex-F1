import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Gate the admin console + the article write API behind HTTP Basic auth using
 * ADMIN_PASSWORD (username: apex). Until that env is set, /admin is 404'd in
 * production so the unauthenticated console is never publicly reachable.
 * Replace with Supabase Auth role gating when multi-user editing lands.
 */
export function middleware(req: NextRequest) {
  const pw = process.env.ADMIN_PASSWORD;

  if (!pw) {
    if (process.env.VERCEL_ENV === 'production') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization');
  const expected = 'Basic ' + btoa(`apex:${pw}`);
  if (auth !== expected) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Apex Admin", charset="UTF-8"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/articles', '/api/articles/:path*'],
};
