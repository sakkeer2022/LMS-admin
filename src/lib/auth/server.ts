import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUserSchema } from "./access";

// The backend decides who is signed in: the access cookie is checked with GET /auth/me, so
// no signing secret is shared with this app. Expiry, revocation and disabled accounts all
// come back as 401 there. Who may enter the portal and what they may do come from
// GET /admin/me/permissions, read from the database, so roles made in the admin UI work and a
// change applies on the next page load. The API enforces permissions regardless of what the UI shows.
export async function requireAdmin() {
  const path = (await headers()).get("x-pathname") ?? "/admin/dashboard";
  const toLogin = `/login?redirect=${encodeURIComponent(path)}`;
  const token = (await cookies()).get("admin_accessToken")?.value;
  if (!token) redirect(toLogin);
  const origin = `${process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:3000"}/api/v1`;
  const get = (path: string) =>
    fetch(`${origin}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  const [response, access] = await Promise.all([
    get("/auth/me"),
    get("/admin/me/permissions"),
  ]);
  if (response.status === 401 || access.status === 401) redirect(toLogin);
  if (access.status === 403) redirect("/access-denied");
  // An admin-set password must be replaced before anything else: the API refuses other routes until then
  if (access.ok && !path.startsWith("/admin/profile")) {
    const must = (await access.clone().json())?.data?.mustChangePassword === true;
    if (must) redirect("/admin/profile?change-password=1");
  }
  if (!response.ok || !access.ok) throw new Error("Unable to verify session");
  const body = await response.json();
  const user = sessionUserSchema.safeParse(body?.data);
  const granted = (await access.json())?.data;
  const grants = granted?.permissions;
  if (
    !body?.success ||
    !user.success ||
    !user.data.isActive ||
    !Array.isArray(grants)
  )
    redirect("/access-denied");
  return {
    user: user.data,
    permissions: grants as string[],
    roles: (granted?.roles ?? []) as string[],
  };
}
