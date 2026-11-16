"use client";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  SearchX,
  TriangleAlert,
  Eye as EyeIcon,
} from "lucide-react";
import { Tip } from "@/components/feedback/tip";
import { SearchInput } from "@/components/forms/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { Skeleton } from "@/components/shadcn/skeleton";
import { cn } from "@/lib/utils";
import {
  areaFor,
  changesThings,
  forAdminRoles,
  isView,
  wordsFor,
} from "./permission-copy";
import type { PermissionItem } from "./types";

type Level = "none" | "view" | "manage" | "custom";
const LEVELS: { id: Exclude<Level, "custom">; label: string }[] = [
  { id: "none", label: "None" },
  { id: "view", label: "View" },
  { id: "manage", label: "Manage" },
];

function levelOf(
  items: PermissionItem[],
  selected: ReadonlySet<string>,
): Level {
  const on = items.filter((p) => selected.has(p.id));
  if (on.length === 0) return "none";
  if (on.length === items.length) return "manage";
  const views = items.filter(isView);
  if (views.length > 0 && on.length === views.length && on.every(isView))
    return "view";
  return "custom";
}

/**
 * Permissions as one card per area, in plain words. Each card has a None / View / Manage switch for the
 * usual cases and a "Permissions" list of toggle chips for the exceptions. A search narrows the cards and opens the matches.
 * `locked` permissions are shown but cannot be switched on (the editor cannot grant what it does not hold).
 */
export function PermissionMatrix({
  catalogue,
  selected,
  onChange,
  readOnly,
  locked,
  loading,
}: {
  catalogue: PermissionItem[] | undefined;
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  readOnly: boolean;
  locked: ReadonlySet<string>;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const needle = search.trim().toLowerCase();

  const areas = useMemo(() => {
    const byArea = new Map<string, PermissionItem[]>();
    for (const p of (catalogue ?? []).filter(forAdminRoles)) {
      const { title } = areaFor(p.resource);
      const w = wordsFor(p);
      if (
        needle &&
        !`${title} ${w.label} ${w.summary} ${p.name}`
          .toLowerCase()
          .includes(needle)
      )
        continue;
      byArea.set(p.resource, [...(byArea.get(p.resource) ?? []), p]);
    }
    return [...byArea.entries()].sort(([a], [b]) =>
      areaFor(a).title.localeCompare(areaFor(b).title),
    );
  }, [catalogue, needle]);

  const set = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (on && locked.has(id)) continue;
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange(next);
  };
  const apply = (items: PermissionItem[], level: Exclude<Level, "custom">) => {
    const all = items.map((p) => p.id);
    const next = new Set(selected);
    for (const id of all) next.delete(id);
    const keep =
      level === "manage" ? items : level === "view" ? items.filter(isView) : [];
    for (const p of keep)
      if (!locked.has(p.id) || selected.has(p.id)) next.add(p.id);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        label="Search what a role can do"
        placeholder="Search, for example “approve tutors”"
        className="w-full sm:w-96"
        value={search}
        onChange={setSearch}
      />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches"
          description="Try another word, like “tutor” or “price”."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {areas.map(([resource, items], index) => {
            const { title, blurb, icon: Icon } = areaFor(resource);
            const level = levelOf(items, selected);
            const on = items.filter((p) => selected.has(p.id)).length;
            const expanded = Boolean(needle) || open.has(resource);
            const panel = `area-${resource}`;
            return (
              <li
                key={resource}
                style={{ "--i": index } as React.CSSProperties}
                className={cn(
                  "anim-rise flex flex-col gap-3 rounded-md border border-l-4 bg-card p-4 shadow-card transition-colors duration-200 hover:border-border-strong",
                  level !== "none" && "border-l-primary",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Icon
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0",
                          level === "none"
                            ? "text-muted-foreground"
                            : "text-primary",
                        )}
                      />
                      {title}
                    </h3>
                    {blurb && (
                      <p className="text-xs text-text-secondary">{blurb}</p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-pill bg-sunken px-2 py-0.5 text-xs font-semibold text-text-secondary"
                    aria-live="polite"
                  >
                    {on}/{items.length}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={`${title} access`}
                  className="grid grid-cols-3 gap-1 rounded-md bg-sunken p-0.5"
                >
                  {LEVELS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={level === id}
                      disabled={readOnly}
                      onClick={() => apply(items, id)}
                      className={cn(
                        "rounded-[4px] py-1.5 text-sm font-semibold text-text-secondary outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                        level === id && "bg-card text-primary shadow-card",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panel}
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(resource)) next.delete(resource);
                      else next.add(resource);
                      return next;
                    })
                  }
                  className="flex items-center gap-1 self-start rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  Permissions
                  {level === "custom" && (
                    <span className="font-normal text-text-secondary">
                      (custom mix)
                    </span>
                  )}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform duration-200 motion-reduce:transition-none",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
                <div
                  id={panel}
                  className={cn(
                    "-mt-1 grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <ul
                    className="flex flex-wrap gap-2 overflow-hidden p-0.5"
                    inert={!expanded}
                  >
                    {items.map((p) => {
                      const w = wordsFor(p);
                      const isOn = selected.has(p.id);
                      const blocked = readOnly || (locked.has(p.id) && !isOn);
                      return (
                        <li key={p.id}>
                          <Tip
                            label={
                              <span className="flex max-w-60 flex-col gap-1">
                                <span>{w.summary}</span>
                                {locked.has(p.id) && !isOn && (
                                  <span>
                                    You do not have this yourself, so you cannot
                                    give it.
                                  </span>
                                )}
                                <code className="font-mono text-xs">
                                  {p.name}
                                </code>
                              </span>
                            }
                          >
                            <button
                              type="button"
                              aria-pressed={isOn}
                              disabled={blocked}
                              onClick={() => set([p.id], !isOn)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                                isOn
                                  ? "border-primary bg-accent font-semibold text-accent-foreground"
                                  : "bg-card text-text-secondary hover:border-border-strong",
                              )}
                            >
                              {isOn && (
                                <Check aria-hidden className="size-3.5" />
                              )}
                              {w.label}
                              {changesThings(p) && (
                                <TriangleAlert
                                  aria-label="Changes things"
                                  className="size-3.5 text-warning-foreground"
                                />
                              )}
                              {w.risk === "sensitive" && (
                                <EyeIcon
                                  aria-label="Private data"
                                  className="size-3.5 text-info-foreground"
                                />
                              )}
                            </button>
                          </Tip>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
