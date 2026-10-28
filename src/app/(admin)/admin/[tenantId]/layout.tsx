import type { ReactNode } from "react";
import { requirePortal } from "@/lib/auth/server";
import { PermissionProvider } from "@/components/security/permission-provider";
import { AdminLayout } from "@/components/layout/admin/AdminLayout";
import { isDevAdminRoute } from '@/lib/auth/dev-admin';
import { DevAdminBoundary } from '@/components/security/dev-admin-boundary';
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const claims = await requirePortal("admin", tenantId);
  const content = (
    <PermissionProvider permissions={claims.permissions}>
      <AdminLayout tenant={tenantId}>
        {children}
      </AdminLayout>
    </PermissionProvider>
  );
  return isDevAdminRoute('admin', tenantId) ? <DevAdminBoundary>{content}</DevAdminBoundary> : content;
}
