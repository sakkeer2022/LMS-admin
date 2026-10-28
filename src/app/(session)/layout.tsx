import type { ReactNode } from "react";
// Group layout owns presentation only; tenant layout performs authoritative session checks.
export default function Layout({ children }: { children: ReactNode }) {
  return <div className="session">{children}</div>;
}
