import type { ReactNode } from "react";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="max-w-lg mx-auto py-16">
      {children}
    </main>
  );
}
