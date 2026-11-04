"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { SettingSelect } from "@/components/settings/setting-layout";
import { useCountries } from "@/features/legal/api";
import { useStudents } from "./api";
import { StudentSheet } from "./student-sheet";
import {
  CONSENT_LABELS,
  RELATIONSHIP_LABELS,
  type AdminStudent,
  type ConsentStatus,
  type StudentFilters,
} from "./types";

const LIMIT = 20;

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso),
  );

export function ConsentBadge({ status }: { status: ConsentStatus }) {
  return (
    <Badge
      variant={
        status === "signed"
          ? "success"
          : status === "missing"
            ? "warning"
            : "secondary"
      }
    >
      {CONSENT_LABELS[status]}
    </Badge>
  );
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function StudentsPage() {
  const allowed = usePermission("student.read");
  const countries = useCountries();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState<"" | "true" | "false">("");
  const [consent, setConsent] = useState<"" | ConsentStatus>("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = useDebounced(search.trim());

  const filters: StudentFilters = {
    page,
    limit: LIMIT,
    ...(q && { q }),
    ...(country && { country }),
    ...(age && { minor: age }),
    ...(consent && { consent }),
  };
  const query = useStudents(filters, allowed);
  // How many minors have no signed consent at all, whatever the filters: the number that needs attention
  const attention = useStudents(
    { page: 1, limit: 1, consent: "missing" },
    allowed,
  );
  const missing = attention.data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<AdminStudent>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Student",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <button
              type="button"
              className="w-fit text-left font-semibold underline-offset-2 hover:underline focus-visible:underline"
              onClick={() => setSelected(row.original.id)}
            >
              {row.original.fullName}
            </button>
            <span className="truncate text-xs text-text-secondary">
              {row.original.email}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "age",
        header: "Age",
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            {row.original.age}
            {row.original.isMinor && <Badge variant="info">Minor</Badge>}
          </span>
        ),
      },
      { accessorKey: "country", header: "Country" },
      {
        id: "guardian",
        header: "Guardian",
        cell: ({ row }) =>
          row.original.guardian ? (
            <span className="flex flex-col">
              <span>{row.original.guardian.fullName}</span>
              <span className="text-xs text-text-secondary">
                {RELATIONSHIP_LABELS[row.original.guardian.relationship] ??
                  row.original.guardian.relationship}
              </span>
            </span>
          ) : (
            <span className="text-text-secondary">—</span>
          ),
      },
      {
        accessorKey: "consentStatus",
        header: "Guardian consent",
        cell: ({ getValue }) => (
          <ConsentBadge status={getValue<ConsentStatus>()} />
        ),
      },
      {
        accessorKey: "registeredAt",
        header: "Registered",
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(row.original.id)}
          >
            View
          </Button>
        ),
        meta: { align: "right" },
      },
    ],
    [],
  );

  if (!allowed)
    return <PanelMessage>Requires student.read permission.</PanelMessage>;

  function reset<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  return (
    <>
      <PageHeader
        title="Students"
        description="Registered students, their guardian contact and whether a guardian has signed the Student Terms."
      />

      {missing > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning-foreground"
        >
          <AlertTriangle aria-hidden className="size-5 shrink-0" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">
              {missing} {missing === 1 ? "minor has" : "minors have"} no signed
              guardian consent.
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConsent("missing");
              setAge("");
              setCountry("");
              setSearch("");
              setPage(1);
            }}
          >
            Show them
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All students</CardTitle>
          <CardDescription>
            Search by name, email or mobile number, or narrow the list.
          </CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              type="search"
              aria-label="Search students"
              placeholder="Search students"
              className="w-56"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <SettingSelect
              aria-label="Country"
              className="h-9 w-auto text-sm font-normal"
              value={country}
              onChange={(event) => reset(setCountry)(event.target.value)}
            >
              <option value="">All countries</option>
              {(countries.data ?? []).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </SettingSelect>
            <SettingSelect
              aria-label="Age group"
              className="h-9 w-auto text-sm font-normal"
              value={age}
              onChange={(event) =>
                reset(setAge)(event.target.value as "" | "true" | "false")
              }
            >
              <option value="">All ages</option>
              <option value="true">Minors</option>
              <option value="false">Adults</option>
            </SettingSelect>
            <SettingSelect
              aria-label="Guardian consent"
              className="h-9 w-auto text-sm font-normal"
              value={consent}
              onChange={(event) =>
                reset(setConsent)(event.target.value as "" | ConsentStatus)
              }
            >
              <option value="">Any consent status</option>
              <option value="signed">Signed</option>
              <option value="missing">Missing</option>
              <option value="not_required">Not required</option>
            </SettingSelect>
          </div>
        </CardHeader>
        {query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>
            Students could not be loaded.
          </PanelMessage>
        ) : (
          <>
            <DataTable
              caption={`Students, page ${page}`}
              columns={columns}
              data={query.data?.data ?? []}
              getRowId={(student) => student.id}
              loading={query.isPending}
              empty="No students match."
            />
            {query.data && (
              <TablePagination
                page={page}
                limit={LIMIT}
                total={query.data.meta?.total ?? query.data.data.length}
                noun="students"
                onPage={setPage}
              />
            )}
          </>
        )}
      </Card>

      <StudentSheet studentId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
