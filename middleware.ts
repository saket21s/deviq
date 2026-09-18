import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All client-side SPA routes managed by React state in app/page.tsx
const SPA_ROUTES = new Set([
  'analyze', 'compare', 'profile', 'settings', 'history', 'chat', 'practice'
]);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segment = pathname.split('/')[1];

  const applyHsts = (res: NextResponse) => {
    // HSTS only on real HTTPS traffic — never on localhost/dev (would brick
    // local http) and never behind an http terminator.
    const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const host = request.headers.get('host') || '';
    if (proto === 'https' && host !== 'localhost' && !host.startsWith('127.') && !host.startsWith('192.168.') && !host.startsWith('10.')) {
      res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return res;
  };

  // Auth callback pages are transient OAuth handlers — never index them.
  if (segment === 'auth') {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return applyHsts(res);
  }

  // If it's an SPA route, rewrite to the root page so page.tsx handles it
  if (SPA_ROUTES.has(segment)) {
    return applyHsts(NextResponse.rewrite(new URL('/', request.url)));
  }

  return applyHsts(NextResponse.next());
}

export const config = {
  // Run middleware on all paths except Next.js internals and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)', ],
};
