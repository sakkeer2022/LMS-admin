import { NextRequest, NextResponse } from 'next/server';
// Cheap gate only: a missing access cookie goes to sign-in with the full destination kept.
// The signed-in user and role are verified against the backend in the admin layout.
export function middleware(request: NextRequest) {
  const destination = request.nextUrl.pathname + request.nextUrl.search;
  if (!request.cookies.get('accessToken')?.value) {
    const login = new URL('/login', request.url);
    login.searchParams.set('redirect', destination);
    return NextResponse.redirect(login);
  }
  const headers = new Headers(request.headers);
  headers.set('x-pathname', destination);
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/admin/:path*'] };
