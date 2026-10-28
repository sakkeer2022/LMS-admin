import { NextRequest, NextResponse } from 'next/server';
import { verifyAccess } from '@/lib/auth/jwt';
import { isDevAdminRoute } from '@/lib/auth/dev-admin';
import { homeFor, portalAllowed, portals, type Portal } from '@/lib/auth/access';
export async function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(admin|faculty|student|session)\/([^/]+)(?:\/|$)/);
  if (!match) return NextResponse.next();
  const [, portal, tenant] = match;
  if (isDevAdminRoute(portal, tenant)) return NextResponse.next();
  let claims;
  try { claims = await verifyAccess(request.cookies.get('accessToken')?.value ?? ''); }
  catch {
    const login = new URL('/login', request.url);
    login.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (!claims.tenantIds?.includes(tenant)) return NextResponse.redirect(new URL('/access-denied', request.url));
  if (!(portal in portals) || !portalAllowed(claims, portal as Portal)) {
    const home = homeFor(claims);
    return NextResponse.redirect(new URL(home ? `/${home}/${encodeURIComponent(tenant)}` : '/access-denied', request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*', '/session/:path*'] };
