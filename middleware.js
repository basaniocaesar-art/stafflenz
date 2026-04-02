import { NextResponse } from 'next/server';

// Lightweight middleware — only checks cookie existence
// Full verification happens in API routes / page server components
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Routes that require a session cookie
  const protectedPaths = ['/factory', '/hotel', '/school', '/retail', '/workers', '/zones', '/admin'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const cookieHeader = request.headers.get('cookie') || '';
    const hasSession = cookieHeader.includes('sl_session=');

    if (!hasSession) {
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
    '/workers/:path*',
    '/zones/:path*',
    '/admin/:path*',
  ],
};
