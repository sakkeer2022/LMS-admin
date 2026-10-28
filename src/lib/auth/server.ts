import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAccess } from './jwt';
import { isDevAdminRoute, devAdminClaims } from './dev-admin';
import { portalAllowed, type Portal } from './access';
export async function requirePortal(portal: Portal, tenant: string) {
  // This reserved route renders a preview shell guarded by sessionStorage on the client.
  if (isDevAdminRoute(portal, tenant)) return devAdminClaims();
  const jar = await cookies();
  let claims;
  try { claims = await verifyAccess(jar.get('accessToken')?.value ?? ''); }
  catch { redirect(`/login?redirect=${encodeURIComponent(`/${portal}/${tenant}`)}`); }
  if (!portalAllowed(claims, portal) || !claims.tenantIds?.includes(tenant)) redirect('/access-denied');
  // Backend remains authoritative for revocation, disabled accounts, ABAC and tenant data access.
  const response = await fetch(`${process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:3000'}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${jar.get('accessToken')!.value}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) redirect('/login');
  if (!response.ok) throw new Error('Unable to verify session');
  const profile = await response.json();
  if (!profile.success || !profile.data?.isActive) redirect('/access-denied');
  return claims;
}
