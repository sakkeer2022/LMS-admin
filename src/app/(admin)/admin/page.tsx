import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAccess } from '@/lib/auth/jwt';
import { portalAllowed } from '@/lib/auth/access';
export default async function Page() {
  let claims;
  try { claims = await verifyAccess((await cookies()).get('accessToken')?.value ?? ''); }
  catch { redirect('/login?redirect=%2Fadmin'); }
  if (!portalAllowed(claims, 'admin') || !claims.tenantIds?.length) redirect('/access-denied');
  redirect(`/admin/${encodeURIComponent(claims.tenantIds[0])}/dashboard`);
}
