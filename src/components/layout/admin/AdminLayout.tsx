import type { ReactNode } from 'react';
import { PortalShell } from '../portal-shell';
export function AdminLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
