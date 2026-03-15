import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All client-side SPA routes managed by React state in app/page.tsx
const SPA_ROUTES = new Set([
  'analyze', 'compare', 'profile', 'settings', 'history', 'following', 'chat', 'practice'
]);

export function middleware(request: NextRequest) {
  const segment = request.nextUrl.pathname.split('/')[1];

  // If it's an SPA route, rewrite to the root page so page.tsx handles it
  if (SPA_ROUTES.has(segment)) {
    return NextResponse.rewrite(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except Next.js internals and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)', ],
};
