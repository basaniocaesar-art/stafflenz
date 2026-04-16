import { NextResponse } from 'next/server';

// Lightweight middleware — only checks cookie existence
// Full verification happens in API routes / page server components
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Affiliate dashboard uses its own cookie
  if (pathname.startsWith('/affiliate/dashboard') || pathname.startsWith('/affiliate/me')) {
    const cookieHeader = request.headers.get('cookie') || '';
    if (!cookieHeader.includes('sl_aff_session=')) {
      return NextResponse.redirect(new URL('/affiliate/login', request.url));
    }
    return NextResponse.next();
  }

  // All other protected routes use main session cookie
  const protectedPaths = [
    '/factory', '/hotel', '/school', '/retail',
    '/restaurant', '/warehouse', '/construction', '/hospital', '/security',
    '/workers', '/zones', '/attendance', '/incidents',
    '/admin', '/whitelabel/dashboard',
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const cookieHeader = request.headers.get('cookie') || '';
    if (!cookieHeader.includes('sl_session=')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/factory/:path*',
    '/hotel/:path*',
    '/school/:path*',
    '/retail/:path*',
    '/restaurant/:path*',
    '/warehouse/:path*',
    '/construction/:path*',
    '/hospital/:path*',
    '/security/:path*',
    '/workers/:path*',
    '/zones/:path*',
    '/attendance/:path*',
    '/incidents/:path*',
    '/admin/:path*',
    '/whitelabel/dashboard/:path*',
    '/affiliate/dashboard/:path*',
  ],
};
