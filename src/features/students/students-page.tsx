"use client";
import { useEffect, useMemo, useState } from "react";
import { Baby, SearchX, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import { Card } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { useCountries } from "@/features/legal/api";
import { cn } from "@/lib/utils";
import { useStudents } from "./api";
import {
  NO_FILTERS,
  StudentsFilters,
  type FilterState,
} from "./students-filters";
import { TablePagination } from "@/components/data-table/table-pagination";
import { StudentsList } from "./students-table";
import { StudentSheet } from "./student-sheet";
import type { StudentFilters } from "./types";

const NO_COUNTRIES: { code: string; name: string }[] = [];

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** One count that is also a shortcut to the list it counts. */
function Stat({
  label,
  icon: Icon,
  value,
  hint,
  progress,
  tone = "default",
  pressed,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  value: number | undefined;
  hint: string;
  /** A share of the whole, drawn as a thin bar under the hint */
  progress?: { done: number; total: number };
  tone?: "default" | "warning";
  pressed: boolean;
  onClick: () => void;
}) {
  const warn = tone === "warning" && (value ?? 0) > 0;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-md border bg-card p-4 text-left shadow-card outline-none transition-all hover:-translate-y-px hover:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none",
        pressed && "border-primary bg-accent/40",
        warn && !pressed && "border-warning-border/50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-md",
          warn
            ? "bg-warning-subtle text-warning-foreground"
            : "bg-accent text-primary",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold text-text-secondary">
          {label}
        </span>
        {value === undefined ? (
          <Skeleton className="my-1 h-7 w-12" />
        ) : (
          <span className="text-2xl leading-8 font-bold tracking-tight">
            {value.toLocaleString()}
          </span>
        )}
        <span className="text-xs text-text-secondary">{hint}</span>
        {progress && progress.total > 0 && (
          <span
            role="progressbar"
            aria-label={hint}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-sunken"
          >
            <span
              className="block h-full rounded-pill bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </span>
        )}
      </span>
    </button>
  );
}

export function StudentsPage() {
  const allowed = usePermission("student.read");
  const countries = useCountries();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const q = useDebounced(filters.search.trim());

  const params: StudentFilters = {
    page,
    limit,
    ...(q && { q }),
    ...(filters.country && { country: filters.country }),
    ...(filters.age && { minor: filters.age }),
    ...(filters.consent && { consent: filters.consent }),
  };
  const query = useStudents(params, allowed);
  // Whole-roster counts, whatever the filters, so they stay put while the list is narrowed
  const everyone = useStudents({ page: 1, limit: 1 }, allowed);
  const minors = useStudents({ page: 1, limit: 1, minor: "true" }, allowed);
  const missing = useStudents(
    { page: 1, limit: 1, consent: "missing" },
    allowed,
  );

  const countryList = countries.data ?? NO_COUNTRIES;
  const countryName = useMemo(() => {
    const names = new Map(countryList.map((item) => [item.code, item.name]));
    return (code: string) => names.get(code) ?? code;
  }, [countryList]);

  if (!allowed)
    return <PanelMessage>Requires student.read permission.</PanelMessage>;

  // Any change to the search or filters starts again from the first page
  function change(next: FilterState) {
    setFilters(next);
    setPage(1);
  }
  const only = (patch: Partial<FilterState>): FilterState => ({
    ...NO_FILTERS,
    ...patch,
  });
  const is = (state: FilterState) =>
    filters.search === state.search &&
    filters.country === state.country &&
    filters.age === state.age &&
    filters.consent === state.consent;
  const filtered = !is(NO_FILTERS);
  const total = query.data?.meta?.total ?? query.data?.data.length ?? 0;
  const minorTotal = minors.data?.meta?.total;
  const missingTotal = missing.data?.meta?.total;
  const listed = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Students"
        description="Registered students, their guardian contact and whether a guardian has signed the Student Terms."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="All students"
          icon={Users}
          value={everyone.data?.meta?.total}
          hint="Registered accounts"
          pressed={is(NO_FILTERS)}
          onClick={() => change(NO_FILTERS)}
        />
        <Stat
          label="Minors"
          icon={Baby}
          value={minors.data?.meta?.total}
          hint={
            minorTotal !== undefined && missingTotal !== undefined
              ? `${minorTotal - missingTotal} of ${minorTotal} have signed consent`
              : "Under the guardian-consent age"
          }
          progress={
            minorTotal !== undefined && missingTotal !== undefined
              ? { done: minorTotal - missingTotal, total: minorTotal }
              : undefined
          }
          pressed={is(only({ age: "true" }))}
          onClick={() => change(only({ age: "true" }))}
        />
        <Stat
          label="Consent missing"
          icon={ShieldAlert}
          value={missing.data?.meta?.total}
          hint="Minors with no signed consent"
          tone="warning"
          pressed={is(only({ consent: "missing" }))}
          onClick={() => change(only({ consent: "missing" }))}
        />
      </div>

      <Card className="gap-0 overflow-hidden">
        <StudentsFilters
          value={filters}
          countries={countryList}
          onChange={change}
        />
        {query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>
            Students could not be loaded.
          </PanelMessage>
        ) : !query.isPending && query.data?.data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={filtered ? SearchX : Users}
              title={filtered ? "No students match" : "No students yet"}
              description={
                filtered
                  ? "Try a different search, or clear the filters to see everyone."
                  : "Students appear here once they register."
              }
              action={
                filtered ? (
                  <Button variant="outline" onClick={() => change(NO_FILTERS)}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <StudentsList
            students={query.data?.data ?? []}
            loading={query.isPending}
            caption={`Students, page ${page}`}
            countryName={countryName}
            selectedId={selected}
            onSelect={setSelected}
          />
        )}
        {query.data && !query.isError && (
          <TablePagination
            noun="students"
            page={page}
            limit={limit}
            total={total}
            onPage={setPage}
            onLimit={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        )}
      </Card>

      <StudentSheet
        studentId={selected}
        neighbours={listed}
        onSelect={setSelected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
