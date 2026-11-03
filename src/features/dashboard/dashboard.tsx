"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Eye,
  IndianRupee,
  ShieldCheck,
  Star,
} from "lucide-react";
import { usePermission } from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
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
const statusVariant = {
  Completed: "success",
  "In progress": "default",
  Confirmed: "info",
  Cancelled: "destructive",
} as const;

function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant={statusVariant[status as keyof typeof statusVariant] ?? "secondary"}>
      <span aria-hidden className="size-1.5 rounded-pill bg-current" />
      {status}
    </Badge>
  );
}

const columns: ColumnDef<SessionRow>[] = [
  { accessorKey: "time", header: "Time" },
  {
    accessorKey: "student",
    header: "Student",
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

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="gap-2 p-5">
      <p className="text-xs font-semibold tracking-[0.02em] text-text-secondary">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
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
    <Link href={href} className={cn(row, "rounded-md outline-none hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50")}>
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
                    <span className={cn("text-base font-semibold", tone)}>{a.count}</span>
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
                      <Icon aria-hidden className="size-5 shrink-0 text-text-secondary" />
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
                <Button variant="outline">{status ? `Status: ${status}` : "Filter"}</Button>
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
