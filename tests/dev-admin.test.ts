import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { devAdminEnabled, hasDevAdminSession, loginDevAdmin, logoutDevAdmin } from '../src/lib/auth/dev-admin';
import { middleware } from '../src/middleware';
import { api } from '../src/lib/api/client';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function setup() {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_ADMIN_LOGIN', 'true');
  const values = new Map<string, string>();
  vi.stubGlobal('window', { sessionStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
}
describe('temporary development admin', () => {
  it('requires both development and the explicit flag, ignoring stored sessions in production', () => {
    setup();
    expect(loginDevAdmin('admin', 'Admin@123')).toBe(true);
    expect(hasDevAdminSession()).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(devAdminEnabled()).toBe(false);
    expect(hasDevAdminSession()).toBe(false);
    expect(loginDevAdmin('admin', 'Admin@123')).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_ADMIN_LOGIN', 'false');
    expect(devAdminEnabled()).toBe(false);
  });
  it('rejects invalid credentials, retains the session, and clears it on logout', () => {
    setup();
    expect(loginDevAdmin('admin', 'wrong')).toBe(false);
    expect(hasDevAdminSession()).toBe(false);
    expect(loginDevAdmin('admin', 'Admin@123')).toBe(true);
    expect(hasDevAdminSession()).toBe(true);
    logoutDevAdmin();
    expect(hasDevAdminSession()).toBe(false);
  });
  it('safely handles SSR and unavailable storage', () => {
    setup();
    vi.stubGlobal('window', undefined);
    expect(hasDevAdminSession()).toBe(false);
    expect(loginDevAdmin('admin', 'Admin@123')).toBe(false);
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('blocked'); } });
    expect(hasDevAdminSession()).toBe(false);
    expect(() => loginDevAdmin('admin', 'Admin@123')).toThrow('session storage');
  });
  it('opens only the reserved admin preview shell and leaves production guards intact', async () => {
    setup();
    const request = (path: string) => middleware(new NextRequest(`http://localhost:3001${path}`));
    expect((await request('/admin/dev-admin/dashboard')).headers.get('x-middleware-next')).toBe('1');
    expect((await request('/admin/acme/dashboard')).headers.get('location')).toContain('/login');
    expect((await request('/faculty/dev-admin')).headers.get('location')).toContain('/login');
    vi.stubEnv('NODE_ENV', 'production');
    expect((await request('/admin/dev-admin/dashboard')).headers.get('location')).toContain('/login');
  });
  it('blocks live API requests before fetching or initializing CSRF', async () => {
    setup();
    loginDevAdmin('admin', 'Admin@123');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(api('/users')).rejects.toThrow('Development session');
    await expect(api('/users', { method: 'POST', body: '{}' })).rejects.toThrow('Development session');
    expect(fetch).not.toHaveBeenCalled();
  });
});
