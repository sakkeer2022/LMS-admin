import type { ReactNode } from 'react';
export function AdminPageContainer({ children }: { children: ReactNode; }) {
  return <main id="main" className="admin-page-container">{children}</main>;
}
