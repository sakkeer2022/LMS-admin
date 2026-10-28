import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { hasPermission, safeRedirect } from '../src/lib/auth/access';
import { verifyAccess } from '../src/lib/auth/jwt';
import { beforeCutoff, formatSlot } from '../src/lib/date/slots';
import { formatINR, taxBreakdown } from '../src/lib/currency/inr';
describe('security and cross-border contracts', () => {
  it('rejects unsafe redirect targets', () => { for (const value of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\ninvalid']) expect(safeRedirect(value)).toBe('/'); expect(safeRedirect('/admin/acme?q=x')).toBe('/admin/acme?q=x'); });
  it('matches backend permission behavior without normalizing mismatched resources', () => { expect(hasPermission(['users:manage'], 'user.read')).toBe(false); expect(hasPermission(['user:manage'], 'user.read')).toBe(true); expect(hasPermission(['admin.*'], 'audit.read')).toBe(true); expect(hasPermission([], 'user.read')).toBe(false); });
  it('verifies signature and expiry, rejects forged or expired tokens', async () => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters'; const key = new TextEncoder().encode(process.env.JWT_SECRET);
    const sign = (expiry: number, secret = key) => new SignJWT({ email: 'a@b.test', roles: ['admin'], permissions: [] }).setProtectedHeader({ alg: 'HS256' }).setSubject('u1').setExpirationTime(expiry).sign(secret);
    const now = Math.floor(Date.now() / 1000); expect((await verifyAccess(await sign(now + 60))).sub).toBe('u1');
    await expect(verifyAccess(await sign(now - 60))).rejects.toThrow(); await expect(verifyAccess(await sign(now + 60, new TextEncoder().encode('another-secret')))).rejects.toThrow();
  });
  it('formats the same instant across IST and UAE and enforces the exact cutoff', () => { expect(formatSlot('2026-10-21T10:00:00Z', 'Asia/Kolkata')).toContain('3:30'); expect(formatSlot('2026-10-21T10:00:00Z', 'Asia/Dubai')).toContain('2:00'); expect(beforeCutoff('2026-10-21T10:00:00Z', Date.parse('2026-10-21T09:00:00Z'))).toBe(false); });
  it('uses integer paise and basis points', () => { expect(formatINR(123450)).toContain('1,234.50'); expect(taxBreakdown(10000, 1800, 1000)).toEqual({ base: 10000, gst: 1800, tds: 1000, total: 11800, net: 10800 }); });
});
