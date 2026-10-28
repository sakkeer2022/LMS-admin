"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
export interface Blocker {
  id: string;
  message: string;
  href?: string;
  blocking: boolean;
}
const Context = createContext<{
  blockers: Blocker[];
  setBlockers: (value: Blocker[]) => void;
}>({ blockers: [], setBlockers: () => {} });
export const useBlockers = () => useContext(Context);
export function BannerProvider({ children }: { children: ReactNode }) {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  return (
    <Context.Provider value={{ blockers, setBlockers }}>
      <div aria-live="polite">
        {blockers.map((b) => (
          <aside className="banner" key={b.id}>
            {b.message} {b.href && <a href={b.href}>Resolve blocker</a>}
          </aside>
        ))}
      </div>
      {children}
    </Context.Provider>
  );
}
