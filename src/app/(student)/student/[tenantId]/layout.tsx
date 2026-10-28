import type { ReactNode } from "react";
import { requirePortal } from "@/lib/auth/server";
import { PermissionProvider } from "@/components/security/permission-provider";
import { PortalShell } from "@/components/layout/portal-shell";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const claims = await requirePortal("student", tenantId);
  return (
    <PermissionProvider permissions={claims.permissions}>
      <PortalShell portal="student" tenant={tenantId}>
        {children}
      </PortalShell>
    </PermissionProvider>
  );
}
