import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
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
  it('lets a request with an access cookie through, passing the path to the layout', () => {
    const result = request('/admin/users?page=2', 'opaque-token');
    expect(result.headers.get('x-middleware-next')).toBe('1');
    expect(result.headers.get('x-middleware-request-x-pathname')).toBe('/admin/users?page=2');
  });
});
