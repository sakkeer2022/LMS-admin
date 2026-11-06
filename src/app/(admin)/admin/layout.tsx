import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/server";
import { PermissionProvider } from "@/components/security/permission-provider";
import { AdminShell } from "@/components/layout/admin-shell";
import { ReauthProvider } from "@/components/security/reauth-provider";
export default async function Layout({ children }: { children: ReactNode }) {
  const { permissions } = await requireAdmin();
  return (
    <PermissionProvider permissions={permissions}>
      <ReauthProvider>
        <AdminShell>{children}</AdminShell>
      </ReauthProvider>
    </PermissionProvider>
  );
}
