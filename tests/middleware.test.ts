import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { middleware } from '../src/middleware';
function request(path: string, accessToken?: string) {
  const headers = new Headers();
  if (accessToken) headers.set('cookie', `accessToken=${accessToken}`);
  return middleware(new NextRequest(`https://portal.test${path}`, { headers }));
}
describe('admin edge gate', () => {
  it('sends a visitor without a session to sign-in and keeps the full destination', () => {
    const target = new URL(request('/admin/users?page=2').headers.get('location')!);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('redirect')).toBe('/admin/users?page=2');
  });
  it('lets a request with an unexpired access cookie through, passing the path to the layout', async () => {
    const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('10m').sign(new TextEncoder().encode('any-key-the-edge-never-checks'));
    const result = request('/admin/users?page=2', token);
    expect(result.headers.get('x-middleware-next')).toBe('1');
    expect(result.headers.get('x-middleware-request-x-pathname')).toBe('/admin/users?page=2');
  });
  it('sends an expired or malformed access cookie to sign-in so the refresh cookie can renew it', async () => {
    const expired = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode('k'));
    for (const token of [expired, 'opaque-token']) {
      expect(new URL(request('/admin/users', token).headers.get('location')!).pathname).toBe('/login');
    }
  });
});
