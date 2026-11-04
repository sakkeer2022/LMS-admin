"use client";
import { useRef, type KeyboardEvent } from "react";
import { Badge, Button } from "@/components/ui";
import { TAB_LABELS } from "../schemas/faculty";
import { FACULTY_TABS, type FacultyStatusCounts, type FacultyTab } from "../types/faculty";

/**
 * Status tabs above the onboarding queue. Every tab filters the same table, so this is a
 * tablist that controls one panel (`panelId`). Arrow keys, Home and End move between tabs.
 */
export function FacultyStatusTabs({
  value,
  counts,
  panelId,
  onChange,
}: {
  value: FacultyTab;
  counts: FacultyStatusCounts | undefined;
  panelId: string;
  onChange: (tab: FacultyTab) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = FACULTY_TABS.indexOf(value);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? FACULTY_TABS.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % FACULTY_TABS.length
            : event.key === "ArrowLeft"
              ? (index - 1 + FACULTY_TABS.length) % FACULTY_TABS.length
              : -1;
    if (next < 0) return;
    event.preventDefault();
    const tab = FACULTY_TABS[next];
    onChange(tab);
    list.current?.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)?.focus();
  }
  return (
    <div ref={list} role="tablist" aria-label="Faculty status" className="directory-tabs faculty-tabs" onKeyDown={onKeyDown}>
      {FACULTY_TABS.map((tab) => (
        <Button
          key={tab}
          role="tab"
          variant="tab"
          data-tab={tab}
          id={`faculty-tab-${tab}`}
          aria-selected={value === tab}
          aria-controls={panelId}
          tabIndex={value === tab ? 0 : -1}
          onClick={() => onChange(tab)}
        >
          {TAB_LABELS[tab]}
          <Badge className="faculty-tab-count" aria-label={counts ? `${counts[tab]} tutors` : "Loading count"}>
            {counts ? counts[tab] : "…"}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
