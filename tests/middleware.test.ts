import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { middleware } from '../src/middleware';
const key = new TextEncoder().encode('any-key-the-edge-never-checks');
const token = (claims: Record<string, unknown>, exp: string | number = '10m') =>
  new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(exp).sign(key);
function request(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return middleware(new NextRequest(`https://portal.test${path}`, { headers }));
}
describe('admin edge gate', () => {
  it('sends a visitor without a session to sign-in and keeps the full destination', () => {
    const target = new URL(request('/admin/users?page=2').headers.get('location')!);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('redirect')).toBe('/admin/users?page=2');
  });
  it('lets this portal\'s unexpired access cookie through, passing the path to the layout', async () => {
    const result = request('/admin/users?page=2', `admin_accessToken=${await token({ portal: 'admin' })}`);
    expect(result.headers.get('x-middleware-next')).toBe('1');
    expect(result.headers.get('x-middleware-request-x-pathname')).toBe('/admin/users?page=2');
  });
  it('sends an expired or malformed access cookie to sign-in so the refresh cookie can renew it', async () => {
    const expired = await token({ portal: 'admin' }, Math.floor(Date.now() / 1000) - 60);
    for (const value of [expired, 'opaque-token']) {
      expect(new URL(request('/admin/users', `admin_accessToken=${value}`).headers.get('location')!).pathname).toBe('/login');
    }
  });
  it('ignores the unscoped cookie and another portal\'s cookie and token', async () => {
    const other = 'faculty';
    const cookies = [
      `accessToken=${await token({ portal: 'admin' })}`,
      `${other}_accessToken=${await token({ portal: other })}`,
      `admin_accessToken=${await token({ portal: other })}`,
    ];
    for (const cookie of cookies) {
      expect(new URL(request('/admin/users', cookie).headers.get('location')!).pathname).toBe('/login');
    }
  });
});
