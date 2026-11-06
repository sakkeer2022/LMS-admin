"use client";
import type { ReactNode } from "react";
import { Badge } from "@/components/shadcn/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { TAB_LABELS } from "../schemas/faculty";
import { FACULTY_TABS, type FacultyStatusCounts, type FacultyTab } from "../types/faculty";

/**
 * Status tabs above the onboarding queue (screen 27). Every tab filters the same table,
 * so the active tab's panel holds the queue (`children`). Radix gives the arrow-key,
 * Home and End navigation.
 */
export function FacultyStatusTabs({
  value,
  counts,
  onChange,
  children,
}: {
  value: FacultyTab;
  counts: FacultyStatusCounts | undefined;
  onChange: (tab: FacultyTab) => void;
  children?: ReactNode;
}) {
  return (
    <Tabs value={value} onValueChange={(tab) => onChange(tab as FacultyTab)}>
      <TabsList variant="line" aria-label="Faculty status" className="h-auto flex-wrap justify-start">
        {FACULTY_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="flex-none px-3">
            {TAB_LABELS[tab]}
            <Badge variant={value === tab ? "default" : "secondary"} aria-label={counts ? `${counts[tab]} tutors` : "Loading count"}>
              {counts ? counts[tab] : "…"}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={value} className="pt-2">
        {children}
      </TabsContent>
    </Tabs>
  );
}
