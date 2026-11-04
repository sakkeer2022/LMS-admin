import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/server";
import { PermissionProvider } from "@/components/security/permission-provider";
import { AdminShell } from "@/components/layout/admin-shell";
export default async function Layout({ children }: { children: ReactNode }) {
  const { permissions } = await requireAdmin();
  return (
    <PermissionProvider permissions={permissions}>
      <AdminShell>{children}</AdminShell>
    </PermissionProvider>
  );
}
