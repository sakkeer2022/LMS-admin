"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Download,
  Eye,
  GraduationCap,
  IndianRupee,
  ListFilter,
  ShieldCheck,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/feedback/status-badge";
import { usePermission } from "@/components/security/permission-provider";
import { Button } from "@/components/shadcn/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Skeleton } from "@/components/shadcn/skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { exportCSV } from "@/lib/exports/download";
import { formatINR } from "@/lib/currency/inr";
import { cn } from "@/lib/utils";
import { sessions as sessionRows, useDashboard, type DemoState } from "./adapter";

type SessionRow = (typeof sessionRows)[number];

const STATUSES = ["Completed", "In progress", "Confirmed", "Cancelled"];
// The session labels stay as they are; only their colour comes from the shared status table
const statusTone: Record<string, StatusTone> = {
  Completed: "completed",
  "In progress": "processing",
  Confirmed: "approved",
  Cancelled: "cancelled",
};

function StatusPill({ status }: { status: string }) {
  return (
    <StatusBadge status={statusTone[status] ?? "inactive"}>
      <span aria-hidden className="size-1.5 rounded-pill bg-current" />
      {status}
    </StatusBadge>
  );
}

const columns: ColumnDef<SessionRow>[] = [
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ getValue }) => <span className="tabular-nums text-text-secondary">{getValue<string>()}</span>,
  },
  {
    accessorKey: "student",
    header: "Student",
    meta: { mobile: "title" },
    cell: ({ getValue }) => <span className="font-semibold">{getValue<string>()}</span>,
  },
  { accessorKey: "tutor", header: "Tutor" },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ getValue }) => <span className="text-text-secondary">{getValue<string>()}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusPill status={getValue<string>()} />,
  },
  {
    accessorKey: "fee",
    header: "Fee",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-base font-semibold">
        {formatINR(getValue<number>()).replace(".00", "")}
      </span>
    ),
  },
];

const severityTone = {
  danger: "text-error-foreground",
  warning: "text-warning-foreground",
  info: "text-info-foreground",
} as const;

const statIcons: Record<string, LucideIcon> = {
  "Total users": Users,
  "Sessions today": CalendarDays,
  "Revenue this month": IndianRupee,
  "Active tutors": GraduationCap,
};

const toneBg = {
  danger: "bg-error-subtle text-error-foreground",
  warning: "bg-warning-subtle text-warning-foreground",
  info: "bg-info-subtle text-info-foreground",
} as const;

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  const Icon = statIcons[label];
  return (
    <Card className="flex-row items-start gap-4 p-5">
      {Icon && (
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-md bg-accent text-primary">
          <Icon className="size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.02em] text-text-secondary">{label}</p>
        <p className="text-3xl leading-9 font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </Card>
  );
}

function AlertRow({
  permission,
  href,
  children,
}: {
  permission: string;
  href: string;
  children: ReactNode;
}) {
  const allowed = usePermission(permission);
  const row = "flex items-center gap-3 border-b border-border-subtle py-3";
  return allowed ? (
    <Link href={href} className={cn(row, "rounded-md outline-none transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50")}>
      {children}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  ) : (
    <div className={row} title={`Requires ${permission}`}>
      {children}
      <span className="text-xs text-muted-foreground">Restricted</span>
    </div>
  );
}

function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-6 pb-4" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

const activityIcons = { money: IndianRupee, review: Eye, calendar: CalendarDays } as const;
const alertIcons = [AlertTriangle, AlertTriangle, ShieldCheck, Star];

export function Dashboard() {
  const search = useSearchParams();
  const router = useRouter();
  const state = (
    ["loading", "empty", "error"].includes(search.get("demoState") ?? "")
      ? search.get("demoState")
      : "ready"
  ) as DemoState;
  const page = Math.max(1, Number(search.get("page")) || 1);
  const status = search.get("status") ?? "";
  const panelState = (panel: string): DemoState =>
    search.get("failPanel") === panel ? "error" : state;

  const stats = useDashboard("summary", 1, "", panelState("summary"));
  const alerts = useDashboard("alerts", 1, "", panelState("alerts"));
  const activity = useDashboard("activity", 1, "", panelState("activity"));
  const table = useDashboard("sessions", page, status, panelState("sessions"));

  function update(values: Record<string, string>) {
    const params = new URLSearchParams(search);
    Object.entries(values).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    router.replace(`?${params}`, { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Wednesday, 2 September 2026 · figures for September unless stated"
        actions={
          <Button
            variant="outline"
            disabled={!stats.data?.length}
            onClick={() =>
              exportCSV(
                [
                  ["Metric", "Value", "Detail"],
                  ...stats.data!.map((s) => [s.label, s.value, s.detail]),
                ],
                "dashboard-demo-summary.csv",
              )
            }
          >
            <Download aria-hidden />
            Export summary
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isPending ? (
          Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="gap-3 p-5" aria-busy="true">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))
        ) : stats.isError ? (
          <Card className="sm:col-span-2 xl:col-span-4">
            <PanelMessage onRetry={() => void stats.refetch()}>Data unavailable.</PanelMessage>
          </Card>
        ) : stats.data.length ? (
          stats.data.map((s) => <StatTile key={s.label} {...s} />)
        ) : (
          <p className="text-sm text-muted-foreground">No summary data available.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,720fr)_minmax(0,392fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Operational alerts</CardTitle>
            <CardDescription>Four queues are waiting on an admin decision today</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {alerts.isPending ? (
              <PanelSkeleton />
            ) : alerts.isError ? (
              <PanelMessage onRetry={() => void alerts.refetch()}>Data unavailable.</PanelMessage>
            ) : !alerts.data.length ? (
              <PanelMessage>No operational alerts.</PanelMessage>
            ) : (
              alerts.data.map((a, i) => {
                const Icon = alertIcons[i] ?? AlertTriangle;
                const tone = severityTone[a.severity as keyof typeof severityTone];
                return (
                  <AlertRow
                    key={a.title}
                    permission={a.permission}
                    href={`/admin/${a.destination}?filter=${a.filter}`}
                  >
                    <Icon aria-hidden className={cn("size-5 shrink-0", tone)} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <strong className="text-sm leading-5 font-semibold">{a.title}</strong>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <span className={cn("min-w-8 rounded-pill px-2 py-0.5 text-center text-sm font-semibold tabular-nums", toneBg[a.severity as keyof typeof toneBg])}>
                      {a.count}
                    </span>
                  </AlertRow>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Live across all portals</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {activity.isPending ? (
              <PanelSkeleton rows={5} />
            ) : activity.isError ? (
              <PanelMessage onRetry={() => void activity.refetch()}>Data unavailable.</PanelMessage>
            ) : !activity.data.length ? (
              <PanelMessage>No recent activity.</PanelMessage>
            ) : (
              <ul>
                {activity.data.map((a) => {
                  const Icon = activityIcons[a.icon as keyof typeof activityIcons] ?? CalendarDays;
                  return (
                    <li key={a.description} className="flex items-start gap-3 border-b border-border-subtle py-3">
                      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="text-sm">{a.description}</p>
                        <small className="text-xs text-muted-foreground">{a.time}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Today’s sessions</CardTitle>
          <CardDescription>2 September 2026 · all tutors</CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn(status && "border-primary bg-accent/40")}>
                  <ListFilter aria-hidden />
                  {status ? `Status: ${status}` : "Filter"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={status}
                  onValueChange={(value) => update({ status: value, page: "1" })}
                >
                  <DropdownMenuRadioItem value="">All statuses</DropdownMenuRadioItem>
                  {STATUSES.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {s}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        {table.isError ? (
          <PanelMessage onRetry={() => void table.refetch()}>Data unavailable.</PanelMessage>
        ) : (
          <>
            <DataTable
              caption="Today's demonstration sessions"
              columns={columns}
              data={table.data?.rows ?? []}
              getRowId={(row) => row.id}
              loading={table.isPending}
              loadingRows={6}
              empty="No sessions match this filter."
            />
            {table.data && (
              <TablePagination
                page={page}
                limit={6}
                total={table.data.total}
                noun="sessions"
                onPage={(p) => update({ page: String(p) })}
              />
            )}
          </>
        )}
        {table.isFetching && !table.isPending && (
          <p className="sr-only" role="status">
            Refreshing sessions…
          </p>
        )}
      </Card>
    </>
  );
}
