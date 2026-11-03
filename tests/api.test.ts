import { afterEach, describe, expect, it, vi } from 'vitest';
function response(status: number, data: unknown) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }); }
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('HTTP authentication contract', () => {
  it('coalesces simultaneous 401 responses into one cookie refresh and retries once', async () => {
    let refreshCount = 0; const calls = new Map<string, number>();
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/csrf-token')) return response(200, { success: true, data: { csrfToken: 'csrf-value' } });
      if (url.endsWith('/auth/me')) return response(401, { success: false, message: 'Expired' });
      if (url.endsWith('/auth/refresh')) { refreshCount++; expect(new Headers(init?.headers).get('x-csrf-token')).toBe('csrf-value'); return response(200, { success: true, data: null }); }
      const count = (calls.get(url) ?? 0) + 1; calls.set(url, count);
      return count === 1 ? response(401, { success: false, message: 'Expired' }) : response(200, { success: true, message: 'OK', data: [] });
    }));
    const { api } = await import('../src/lib/api/client');
    await Promise.all([api('/users'), api('/roles')]);
    expect(refreshCount).toBe(1); expect(calls.get('/api/v1/users')).toBe(2); expect(calls.get('/api/v1/roles')).toBe(2);
  });
  it('does not refresh an invalid login and preserves field errors and trace references', async () => {
    const fetchMock = vi.fn(async (url: string) => url.endsWith('/auth/csrf-token') ? response(200, { success: true, data: { csrfToken: 'csrf' } }) : response(422, { success: false, message: 'Validation failed', errors: { email: ['Invalid email'] }, traceId: 'trace-1' }));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('../src/lib/api/client');
    await expect(api('/auth/admin/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 422, fields: { email: ['Invalid email'] }, traceId: 'trace-1' });
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/auth/refresh'))).toBe(false);
  });
});
