import type { ReactNode } from 'react';
import { PortalShell } from '../portal-shell';
export function AdminLayout({ tenant, children }: { tenant: string; children: ReactNode; }) {
  return <PortalShell portal="admin" tenant={tenant}>{children}</PortalShell>;
}
