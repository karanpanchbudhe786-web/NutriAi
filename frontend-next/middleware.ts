import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware for Server-Level RBAC Enforcement
 * Inspects `nutriai_role` cookie before page rendering to prevent content leakage.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleCookie = request.cookies.get('nutriai_role')?.value;

  // 1. Unauthenticated users trying to access protected routes
  const isProtectedPath =
    pathname.startsWith('/home') ||
    pathname.startsWith('/meals') ||
    pathname.startsWith('/nutrition') ||
    pathname.startsWith('/business');

  if (isProtectedPath && !roleCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Strict Buddy Role Enforcement:
  // IF user is 'buddy', block all '/business/*' routes and redirect to '/home'
  if (roleCookie === 'buddy' && pathname.startsWith('/business')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // 3. Strict Business Role Enforcement:
  // IF user is 'business', block consumer routes and redirect to '/business/dashboard'
  const isConsumerRoute =
    pathname.startsWith('/meals') ||
    pathname.startsWith('/nutrition') ||
    pathname.startsWith('/rewards') ||
    pathname.startsWith('/community');

  if (roleCookie === 'business' && isConsumerRoute) {
    return NextResponse.redirect(new URL('/business/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home/:path*',
    '/meals/:path*',
    '/nutrition/:path*',
    '/rewards/:path*',
    '/community/:path*',
    '/business/:path*',
  ],
};
