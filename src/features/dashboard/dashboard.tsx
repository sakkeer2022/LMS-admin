"use client";
import { SelectField } from "@/components/ui";
import { Button, Card, Typography } from "@/components/ui";
import { Link } from '@/components/ui/Link';
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ShieldCheck,
  Star,
  ChevronRight,
  CalendarDays,
  IndianRupee,
  Eye,
} from "lucide-react";
import { usePermission } from "@/components/security/permission-provider";
import {
  FilterMenu,
  PanelMessage,
  PageHeader,
  SectionCard,
  StatCard,
  DataTable,
  StatusBadge,
  TablePagination,
  PanelSkeleton,
} from "@/components/ui/dashboard-ui";
import { exportCSV } from "@/lib/exports/download";
import { formatINR } from "@/lib/currency/inr";
import { useDashboard, type DemoState } from "./adapter";
function AlertDestination({
  permission,
  href,
  children,
}: {
  permission: string;
  href: string;
  children: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  return allowed ? (
    <Link href={href} className="alert-row">
      {children}
      <ChevronRight size={16} />
    </Link>
  ) : (
    <div className="alert-row">
      {children}
      <Typography
        variant="body2"
        component="span"
        tone="muted"
        title={`Requires ${permission}`}
      >
        Restricted
      </Typography>
    </div>
  );
}
export function Dashboard() {
  const search = useSearchParams();
  const router = useRouter();
  const state = (
    ["loading", "empty", "error"].includes(search.get("demoState") ?? "")
      ? search.get("demoState")
      : "ready"
  ) as DemoState;
  const page = Math.max(1, Number(search.get("page")) || 1),
    status = search.get("status") ?? "";
  const stats = useDashboard(
    "summary",
    1,
    "",
    search.get("failPanel") === "summary" ? "error" : state,
  );
  const alerts = useDashboard(
    "alerts",
    1,
    "",
    search.get("failPanel") === "alerts" ? "error" : state,
  );
  const activity = useDashboard(
    "activity",
    1,
    "",
    search.get("failPanel") === "activity" ? "error" : state,
  );
  const table = useDashboard(
    "sessions",
    page,
    status,
    search.get("failPanel") === "sessions" ? "error" : state,
  );
  function update(values: Record<string, string>) {
    const params = new URLSearchParams(search);
    Object.entries(values).forEach(([k, v]) =>
      v ? params.set(k, v) : params.delete(k),
    );
    router.replace(`?${params}`, { scroll: false });
  }
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Wednesday, 2 September 2026 · figures for September unless stated"
        action={
          <Button
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
      {/* <Typography
        variant="body1"
        component="p"
        tone="muted"
        className="demo-notice"
      >
        Development data · deterministic demonstration adapter
      </Typography> */}
      <div className="summary-grid">
        {stats.isPending ? (
          Array.from({ length: 4 }, (_, i) => (
            <Card variant="stat" key={i}>
              <PanelSkeleton rows={3} />
            </Card>
          ))
        ) : stats.isError ? (
          <PanelMessage onRetry={() => void stats.refetch()}>
            Data unavailable.
          </PanelMessage>
        ) : stats.data.length ? (
          stats.data.map((s) => <StatCard key={s.label} {...s} />)
        ) : (
          <Typography>No summary data available.</Typography>
        )}
      </div>
      <div className="dashboard-middle">
        <SectionCard
          title="Operational alerts"
          subtitle="Four queues are waiting on an admin decision today"
        >
          {alerts.isPending ? (
            <PanelSkeleton />
          ) : alerts.isError ? (
            <PanelMessage onRetry={() => void alerts.refetch()}>
              Data unavailable.
            </PanelMessage>
          ) : !alerts.data.length ? (
            <PanelMessage>No operational alerts.</PanelMessage>
          ) : (
            <div className="alert-list">
              {alerts.data.map((a, i) => {
                const Icon = [AlertTriangle, AlertTriangle, ShieldCheck, Star][
                  i
                ];
                return (
                  <AlertDestination
                    key={a.title}
                    permission={a.permission}
                    href={`/admin/${a.destination}?filter=${a.filter}`}
                  >
                    <Icon className={a.severity} size={17} />
                    <div>
                      <strong>{a.title}</strong>
                      <Typography variant="caption" component="p" tone="muted">
                        {a.detail}
                      </Typography>
                    </div>
                    <span className={a.severity}>{a.count}</span>
                  </AlertDestination>
                );
              })}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Recent activity" subtitle="Live across all portals">
          {activity.isPending ? (
            <PanelSkeleton rows={5} />
          ) : activity.isError ? (
            <PanelMessage onRetry={() => void activity.refetch()}>
              Data unavailable.
            </PanelMessage>
          ) : !activity.data.length ? (
            <PanelMessage>No recent activity.</PanelMessage>
          ) : (
            <ul className="activity-feed">
              {activity.data.map((a) => {
                const Icon =
                  a.icon === "money"
                    ? IndianRupee
                    : a.icon === "review"
                      ? Eye
                      : CalendarDays;
                return (
                  <li key={a.description}>
                    <Icon size={15} />
                    <div>
                      <Typography variant="body2">{a.description}</Typography>
                      <Typography
                        variant="caption"
                        component="small"
                        tone="muted"
                      >
                        {a.time}
                      </Typography>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
      <SectionCard
        title="Today’s sessions"
        subtitle="2 September 2026 · all tutors"
        action={
          <FilterMenu>
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => update({ status: e.target.value, page: "1" })}
            >
              <option value="">All statuses</option>
              {["Completed", "In progress", "Confirmed", "Cancelled"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </SelectField>
          </FilterMenu>
        }
      >
        {table.isPending ? (
          <PanelSkeleton rows={7} />
        ) : table.isError ? (
          <PanelMessage onRetry={() => void table.refetch()}>
            Data unavailable.
          </PanelMessage>
        ) : (
          <>
            <DataTable
              caption="Today's demonstration sessions"
              headers={["Time", "Student", "Tutor", "Subject", "Status", "Fee"]}
            >
              {table.data.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.time}</td>
                  <td className="cell-strong">{r.student}</td>
                  <td>{r.tutor}</td>
                  <td className="muted">{r.subject}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="money">
                    {formatINR(r.fee).replace(".00", "")}
                  </td>
                </tr>
              ))}
            </DataTable>
            {!table.data.rows.length && (
              <PanelMessage>No sessions match this filter.</PanelMessage>
            )}
            <TablePagination
              page={page}
              limit={6}
              total={table.data.total}
              onPage={(p) => update({ page: String(p) })}
            />
          </>
        )}
        {table.isFetching && !table.isPending && (
          <Typography
            variant="caption"
            component="p"
            tone="muted"
            className="refresh-status"
            role="status"
          >
            Refreshing sessions…
          </Typography>
        )}
      </SectionCard>
    </>
  );
}
