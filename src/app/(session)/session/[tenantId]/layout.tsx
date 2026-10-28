import type { ReactNode } from "react";
import { requirePortal } from "@/lib/auth/server";
import { PermissionProvider } from "@/components/security/permission-provider";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const claims = await requirePortal("session", tenantId);
  return (
    <PermissionProvider permissions={claims.permissions}>
      <main id="main">{children}</main>
    </PermissionProvider>
  );
}
