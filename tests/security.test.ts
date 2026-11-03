import { describe, expect, it } from 'vitest';
import { hasPermission, isAdmin, permissionsOf, safeRedirect, type SessionUser } from '../src/lib/auth/access';
import { formatINR, taxBreakdown } from '../src/lib/currency/inr';
const user = (roles: SessionUser['roles'], isActive = true): SessionUser => ({ id: 'u1', email: 'a@b.test', fullName: 'A B', mobileNumber: null, isActive, emailVerified: true, roles });
describe('security and cross-border contracts', () => {
  it('rejects unsafe redirect targets', () => { for (const value of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\ninvalid']) expect(safeRedirect(value)).toBe('/admin/dashboard'); expect(safeRedirect('/admin/users?q=x')).toBe('/admin/users?q=x'); });
  it('matches backend permission behavior without normalizing mismatched resources', () => { expect(hasPermission(['users:manage'], 'user.read')).toBe(false); expect(hasPermission(['user:manage'], 'user.read')).toBe(true); expect(hasPermission(['admin.*'], 'audit.read')).toBe(true); expect(hasPermission([], 'user.read')).toBe(false); });
  it('allows only active accounts with the admin role', () => {
    const admin = { id: 'r1', name: 'admin', permissions: [{ name: 'user.read' }, { name: 'user.read' }, { name: 'audit.read' }] };
    expect(isAdmin(user([admin]))).toBe(true);
    expect(isAdmin(user([admin], false))).toBe(false);
    expect(isAdmin(user([{ id: 'r2', name: 'student', permissions: [] }]))).toBe(false);
    expect(isAdmin(user([]))).toBe(false);
    expect(permissionsOf(user([admin]))).toEqual(['user.read', 'audit.read']);
  });
  it('uses integer paise and basis points', () => { expect(formatINR(123450)).toContain('1,234.50'); expect(taxBreakdown(10000, 1800, 1000)).toEqual({ base: 10000, gst: 1800, tds: 1000, total: 11800, net: 10800 }); });
});
