import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAccess } from '@/lib/auth/jwt';
import { grantedTenants, portalAllowed } from '@/lib/auth/access';
export default async function Page() {
  let claims;
  try { claims = await verifyAccess((await cookies()).get('accessToken')?.value ?? ''); }
  catch { redirect('/login?redirect=%2Fadmin'); }
  const [tenant] = grantedTenants(claims);
  if (!portalAllowed(claims, 'admin') || !tenant) redirect('/access-denied');
  redirect(`/admin/${encodeURIComponent(tenant)}/dashboard`);
}
