import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAdmin, permissionsOf, sessionUserSchema } from './access';

// The backend decides who is signed in: the access cookie is checked with GET /auth/me, so
// no signing secret is shared with this app. Expiry, revocation and disabled accounts all
// come back as 401 there.
export async function requireAdmin() {
  const path = (await headers()).get('x-pathname') ?? '/admin/dashboard';
  const toLogin = `/login?redirect=${encodeURIComponent(path)}`;
  const token = (await cookies()).get('admin_accessToken')?.value;
  if (!token) redirect(toLogin);
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
