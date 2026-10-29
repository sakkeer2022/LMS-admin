import { z } from 'zod';
export const claimsSchema = z.object({
  sub: z.string().min(1), email: z.string(), roles: z.array(z.string()), permissions: z.array(z.string()),
  exp: z.number(), jti: z.string().optional(), policies: z.array(z.unknown()).optional(),
  tenantIds: z.array(z.string()).optional(),
});
export type Claims = z.infer<typeof claimsSchema>;
export const portals = {
  admin: { title: 'Operations', roles: ['super_admin', 'admin'], links: [['Overview', ''], ['Users', '/users'], ['Audit logs', '/audit'], ['Financial reports', '/reports']] },
  faculty: { title: 'Provider workspace', roles: ['faculty', 'provider'], links: [['Today', ''], ['Availability', '/availability'], ['Bookings', '/bookings'], ['Daily logs', '/logs'], ['Earnings', '/earnings']] },
  student: { title: 'Learning workspace', roles: ['student', 'client', 'viewer'], links: [['Discover', ''], ['Bookings', '/bookings'], ['Progress reports', '/reports']] },
  session: { title: 'Live session', roles: ['super_admin', 'admin', 'faculty', 'provider', 'student', 'client', 'viewer'], links: [] },
} as const;
export type Portal = keyof typeof portals;
export function portalAllowed(claims: Claims, portal: Portal) { return portals[portal].roles.some(role => claims.roles.includes(role)); }
export function homeFor(claims: Claims) { return (['admin', 'faculty', 'student'] as const).find(p => portalAllowed(claims, p)); }
/**
 * Tenants the signed claims grant. The backend has no tenant model yet and issues no
 * tenantIds claim, so a single-tenant deployment names its one tenant in the server-only
 * SINGLE_TENANT_ID. A token that does carry tenantIds is always checked against it alone.
 */
export function grantedTenants(claims: Claims, singleTenant = process.env.SINGLE_TENANT_ID) {
  if (claims.tenantIds) return claims.tenantIds;
  return singleTenant ? [singleTenant] : [];
}
export function tenantAllowed(claims: Claims, tenant: string, singleTenant?: string) {
  return grantedTenants(claims, singleTenant).includes(tenant);
}
export function hasPermission(grants: string[], required: string) {
  return grants.some(grant => {
    if (grant === '*' || grant === 'admin.*' || grant === required) return true;
    const [resource] = required.split(/[.:]/);
    const [subject, action] = grant.split(/[.:]/);
    return resource === subject && (action === '*' || action === 'manage');
  });
}
export function safeRedirect(value: string | null, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  return value;
}
