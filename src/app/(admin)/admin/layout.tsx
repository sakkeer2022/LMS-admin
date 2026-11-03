import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/server";
import { PermissionProvider } from "@/components/security/permission-provider";
import { AdminLayout } from "@/components/layout/admin/AdminLayout";
export default async function Layout({ children }: { children: ReactNode }) {
  const { permissions } = await requireAdmin();
  return (
    <PermissionProvider permissions={permissions}>
      <AdminLayout>{children}</AdminLayout>
    </PermissionProvider>
  );
}
