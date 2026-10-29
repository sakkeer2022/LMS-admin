import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
process.env.JWT_SECRET = 'middleware-test-secret-at-least-32-characters';
async function request(path: string, roles?: string[], tenantIds?: string[]) {
  const headers = new Headers();
  if (roles) {
    const token = await new SignJWT({ email: 'a@b.test', permissions: [], roles, tenantIds }).setProtectedHeader({ alg: 'HS256' }).setSubject('u1').setExpirationTime('5m').sign(new TextEncoder().encode(process.env.JWT_SECRET));
    headers.set('cookie', `accessToken=${token}`);
  }
  return middleware(new NextRequest(`https://portal.test${path}`, { headers }));
}
describe('portal edge boundary', () => {
  it('preserves the full destination when unauthenticated', async () => { const result = await request('/admin/acme/users?page=2'); const target = new URL(result.headers.get('location')!); expect(target.pathname).toBe('/login'); expect(target.searchParams.get('redirect')).toBe('/admin/acme/users?page=2'); });
  it('fails closed without tenant membership', async () => { expect((await request('/admin/acme/users', ['admin'])).headers.get('location')).toBe('https://portal.test/access-denied'); });
  it('redirects the wrong role to its permitted portal', async () => { expect((await request('/admin/acme/users', ['student'], ['acme'])).headers.get('location')).toBe('https://portal.test/student/acme'); });
  it('admits a token without tenantIds only to the configured single tenant', async () => {
    process.env.SINGLE_TENANT_ID = 'acme';
    try {
      expect((await request('/admin/acme/users', ['admin'])).headers.get('x-middleware-next')).toBe('1');
      expect((await request('/admin/other/users', ['admin'])).headers.get('location')).toContain('/access-denied');
      // An explicit claim always wins over the single-tenant setting
      expect((await request('/admin/acme/users', ['admin'], ['other'])).headers.get('location')).toContain('/access-denied');
    } finally { delete process.env.SINGLE_TENANT_ID; }
  });
  it('permits the expected role and tenant but rejects another tenant', async () => { expect((await request('/admin/acme/users', ['admin'], ['acme'])).headers.get('x-middleware-next')).toBe('1'); expect((await request('/admin/other/users', ['admin'], ['acme'])).headers.get('location')).toContain('/access-denied'); });
});
