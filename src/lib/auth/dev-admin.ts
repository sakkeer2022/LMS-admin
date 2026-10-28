import type { Claims } from './access';

// Temporary frontend preview only. Never mint a token or authorize backend data.
export function devAdminEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_ADMIN_LOGIN === 'true';
}
export const devAdminTenant = 'dev-admin';
export const devAdminDashboard = `/admin/${devAdminTenant}/dashboard`;
const sessionKey = 'amentorz-dev-admin';
export function isDevAdminRoute(portal: string, tenant: string) {
  return devAdminEnabled() && portal === 'admin' && tenant === devAdminTenant;
}
export function hasDevAdminSession() {
  if (!devAdminEnabled() || typeof window === 'undefined') return false;
  try { return window.sessionStorage.getItem(sessionKey) === 'active'; }
  catch { return false; }
}
export function loginDevAdmin(username: string, password: string) {
  if (!devAdminEnabled() || username !== 'admin' || password !== 'Admin@123') return false;
  if (typeof window === 'undefined') return false;
  try { window.sessionStorage.setItem(sessionKey, 'active'); return true; }
  catch { throw new Error('Development login requires browser session storage.'); }
}
export function logoutDevAdmin() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(sessionKey);
}
export function devAdminClaims(): Claims {
  return { sub: 'development-admin', email: 'admin@development.invalid', roles: ['admin'], permissions: ['admin.*'], tenantIds: [devAdminTenant], exp: 0 };
}
