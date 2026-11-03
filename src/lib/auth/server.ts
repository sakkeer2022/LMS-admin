import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
<<<<<<< HEAD
import { verifyAccess } from './jwt';
import { isDevAdminRoute, devAdminClaims } from './dev-admin';
import { portalAllowed, tenantAllowed, type Portal } from './access';
export async function requirePortal(portal: Portal, tenant: string) {
  // This reserved route renders a preview shell guarded by sessionStorage on the client.
  if (isDevAdminRoute(portal, tenant)) return devAdminClaims();
  const jar = await cookies();
  let claims;
  try { claims = await verifyAccess(jar.get('accessToken')?.value ?? ''); }
  catch { redirect(`/login?redirect=${encodeURIComponent(`/${portal}/${tenant}`)}`); }
  if (!portalAllowed(claims, portal) || !tenantAllowed(claims, tenant)) redirect('/access-denied');
  // Backend remains authoritative for revocation, disabled accounts, ABAC and tenant data access.
=======
import { isAdmin, permissionsOf, sessionUserSchema } from './access';

// The backend decides who is signed in: the access cookie is checked with GET /auth/me, so
// no signing secret is shared with this app. Expiry, revocation and disabled accounts all
// come back as 401 there.
export async function requireAdmin() {
  const path = (await headers()).get('x-pathname') ?? '/admin/dashboard';
  const toLogin = `/login?redirect=${encodeURIComponent(path)}`;
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) redirect(toLogin);
>>>>>>> a6777d56409e417c23a9cc4069e8febbcfb1aa1a
  const response = await fetch(`${process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:3000'}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) redirect(toLogin);
  if (!response.ok) throw new Error('Unable to verify session');
  const body = await response.json();
  const user = sessionUserSchema.safeParse(body?.data);
  if (!body?.success || !user.success || !isAdmin(user.data)) redirect('/access-denied');
  return { user: user.data, permissions: permissionsOf(user.data) };
}
