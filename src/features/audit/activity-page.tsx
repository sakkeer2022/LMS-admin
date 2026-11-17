"use client";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, History, SearchX, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { FilterChip } from "@/components/feedback/filter-chip";
import { Field } from "@/components/forms/field";
import { SearchInput } from "@/components/forms/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { NoAccess } from "@/components/security/no-access";
import { usePermission } from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { FilterSelect } from "@/features/students/students-filters";
import { NativeSelect } from "@/components/shadcn/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import { exportCSV } from "@/lib/exports/download";
import {
  fetchAuditForExport,
  EXPORT_LIMIT,
  useActorNames,
  useAudit,
  useStaffOptions,
} from "./api";
import { DiffView } from "./diff-view";
import {
  NO_AUDIT_FILTERS,
  windowError,
  type AuditEvent,
  type AuditFilters,
} from "./types";

const SEVERITY = {
  INFO: "secondary",
  WARN: "warning",
  SECURITY: "info",
  CRITICAL: "destructive",
} as const;
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function ActivityPage() {
  const allowed = usePermission("audit.read");
  const canSeeUsers = usePermission("user.read");
  const [filters, setFilters] = useState<AuditFilters>(NO_AUDIT_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [open, setOpen] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState(false);

  const rangeError = windowError(filters);
  const valid = !rangeError;
  const staff = useStaffOptions(allowed && canSeeUsers);
  const query = useAudit(filters, page, limit, allowed && valid);
  const rows = query.data?.data ?? [];
  const fetched = useActorNames(
    rows.flatMap((r) => (r.actorId ? [r.actorId] : [])),
    allowed && canSeeUsers,
  );
  const names = useMemo(
    () =>
      new Map([
        ...(staff.data ?? []).map((u) => [u.id, u.fullName] as const),
        ...fetched,
      ]),
    [staff.data, fetched],
  );
  const actor = (id: string | null) =>
    id ? (names.get(id) ?? `${id.slice(0, 8)}…`) : "System";
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_AUDIT_FILTERS);
  const change = (patch: Partial<AuditFilters>) => {
    setFilters({ ...filters, ...patch });
    setPage(1);
  };

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{when(getValue<string>())}</span>
        ),
      },
      {
        id: "actor",
        header: "Who",
        cell: ({ row }) => (
          <span className="max-w-48 truncate font-medium">
            {actor(row.original.actorId)}
          </span>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ getValue }) => (
          <code className="font-mono text-xs">{getValue<string>()}</code>
        ),
      },
      {
        id: "entity",
        header: "Item",
        cell: ({ row: { original: e } }) => (
          <span className="flex flex-col">
            <span>{e.entity}</span>
            {e.resourceId && (
              <span className="font-mono text-xs text-muted-foreground">
                {e.resourceId.slice(0, 8)}…
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "severity",
        header: "Level",
        cell: ({ getValue }) => (
          <Badge
            variant={
              SEVERITY[getValue<AuditEvent["severity"]>()] ?? "secondary"
            }
          >
            {getValue<string>()}
          </Badge>
        ),
      },
    ],
    [names],
  );

  async function download() {
    setExporting(true);
    try {
      const { rows: all, truncated } = await fetchAuditForExport(filters);
      exportCSV(
        [
          [
            "When (UTC)",
            "Who",
            "Action",
            "Item",
            "Item id",
            "Level",
            "Before",
            "After",
          ],
          ...all.map((e) => [
            e.createdAt,
            actor(e.actorId),
            e.action,
            e.entity,
            e.resourceId ?? "",
            e.severity,
            JSON.stringify(e.changes?.before ?? ""),
            JSON.stringify(e.changes?.after ?? ""),
          ]),
        ],
        "activity-log.csv",
      );
      toast.success(
        truncated
          ? `Exported the first ${EXPORT_LIMIT} entries. Narrow the dates to get the rest.`
          : `Exported ${all.length} entries`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The export failed");
    } finally {
      setExporting(false);
    }
  }

  if (!allowed) return <NoAccess permission="audit.read" />;
  const total = query.data?.meta?.total ?? rows.length;

  return (
    <>
      <PageHeader
        title="Activity log"
        description="A permanent record of sign-ins and changes to roles, permissions and users. Entries cannot be edited or deleted."
        actions={
          <Button
            variant="outline"
            disabled={exporting || !valid || rows.length === 0}
            onClick={() => void download()}
          >
            <Download aria-hidden /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />
      <Card className="gap-0 overflow-hidden">
        <div className="grid grid-cols-1 gap-3 border-b border-border-subtle p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label="Show">
            {({ id }) => (
              <NativeSelect
                id={id}
                value={filters.view}
                onChange={(e) =>
                  change({ view: e.target.value as AuditFilters["view"] })
                }
              >
                <option value="activity">Activity</option>
                <option value="requests">API requests</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="From" error={rangeError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="date"
                value={filters.from}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                onChange={(e) => change({ from: e.target.value })}
              />
            )}
          </Field>
          <Field label="To">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={filters.to}
                onChange={(e) => change({ to: e.target.value })}
              />
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium leading-none">Action</span>
            <SearchInput
              label="Search by exact action"
              placeholder="Exact action, e.g. role.update"
              value={filters.action}
              onChange={(value) => change({ action: value.trim() })}
            />
          </div>
          <Field label="Item type">
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. role, user"
                value={filters.entity}
                onChange={(e) => change({ entity: e.target.value.trim() })}
              />
            )}
          </Field>
          {canSeeUsers && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium leading-none">Who</span>
              <FilterSelect
                label="Filter by user"
                icon={UserRound}
                allLabel="Everyone"
                value={filters.actorId}
                options={(staff.data ?? []).map((u) => ({
                  value: u.id,
                  label: u.fullName,
                }))}
                onChange={(actorId) => change({ actorId })}
              />
            </div>
          )}
        </div>
        {filtered && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-2">
            {filters.actorId && (
              <FilterChip
                label={`User: ${actor(filters.actorId)}`}
                onRemove={() => change({ actorId: "" })}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(NO_AUDIT_FILTERS);
                setPage(1);
              }}
            >
              <X aria-hidden /> Clear filters
            </Button>
          </div>
        )}
        {query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>
            {query.error instanceof Error
              ? query.error.message
              : "The log could not be loaded."}
          </PanelMessage>
        ) : !query.isPending && valid && rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={filtered ? SearchX : History}
              title={filtered ? "No entries match" : "Nothing recorded yet"}
              description={
                filtered
                  ? "Try wider dates or fewer filters."
                  : "Activity appears here as it happens."
              }
            />
          </div>
        ) : (
          <DataTable
            caption={`Activity log, page ${page}`}
            columns={columns}
            data={rows}
            getRowId={(e) => e.id}
            loading={query.isPending && valid}
            onRowClick={setOpen}
            isRowSelected={(e) => e.id === open?.id}
          />
        )}
        {query.data && !query.isError && (
          <TablePagination
            noun="entries"
            page={page}
            limit={limit}
            total={total}
            onPage={setPage}
            onLimit={(n) => {
              setLimit(n);
              setPage(1);
            }}
          />
        )}
      </Card>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader className="gap-1 border-b border-border-subtle bg-accent/40 p-5 pr-12">
                <SheetTitle className="font-mono text-base">
                  {open.action}
                </SheetTitle>
                <SheetDescription>
                  {when(open.createdAt)} · {actor(open.actorId)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-5 p-5">
                <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-text-secondary">Item</dt>
                  <dd>
                    {open.entity}
                    {open.resourceId && (
                      <span className="block break-all font-mono text-xs text-muted-foreground">
                        {open.resourceId}
                      </span>
                    )}
                  </dd>
                  <dt className="text-text-secondary">Level</dt>
                  <dd>
                    <Badge variant={SEVERITY[open.severity] ?? "secondary"}>
                      {open.severity}
                    </Badge>
                  </dd>
                  <dt className="text-text-secondary">Reference</dt>
                  <dd className="break-all font-mono text-xs">
                    {open.traceId}
                  </dd>
                </dl>
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">What changed</h3>
                  <DiffView
                    before={open.changes?.before}
                    after={open.changes?.after}
                  />
                </div>
                {open.actorId && (
                  <Button
                    variant="outline"
                    className="self-start"
                    onClick={() => {
                      change({ actorId: open.actorId! });
                      setOpen(null);
                    }}
                  >
                    Only this user
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
