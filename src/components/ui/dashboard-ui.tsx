import { Badge, Button, Card, Disclosure, Typography } from "@/components/ui";
import type { ReactNode } from "react";
export function FilterMenu({ children }: { children: ReactNode }) {
  return (
    <Disclosure className="filter-menu" summary="Filter">
      <div className="filter-menu-panel">{children}</div>
    </Disclosure>
  );
}
export function PanelMessage({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="panel-message" role={onRetry ? "alert" : undefined}>
      {children}
      {onRetry && (
        <>
          {" "}
          <Button onClick={onRetry}>Retry</Button>
        </>
      )}
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <Typography variant="h1">{title}</Typography>
        <Typography variant="body2" tone="muted">
          {subtitle}
        </Typography>
      </div>
      {action}
    </div>
  );
}
export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card variant="section">
      <div className="section-heading">
        <div>
          <Typography variant="h2">{title}</Typography>
          {subtitle && (
            <Typography variant="caption" component="p" tone="muted">
              {subtitle}
            </Typography>
          )}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card variant="stat">
      <Typography variant="body2">{label}</Typography>
      <strong>{value}</strong>
      <Typography variant="caption" component="p" tone="muted">
        {detail}
      </Typography>
    </Card>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const tone = ["Completed", "Verified", "Active"].includes(status)
    ? "success"
    : ["Confirmed"].includes(status)
      ? "info"
      : ["Cancelled", "Suspended", "Archived"].includes(status)
        ? "danger"
        : ["In progress", "Published"].includes(status)
          ? "accent"
          : ["Pending", "Draft"].includes(status)
            ? "warning"
            : "neutral";
  return (
    <Badge tone={tone}>
      <span aria-hidden="true">● </span>
      {status}
    </Badge>
  );
}
export function DataTable({
  headers,
  children,
  caption,
}: {
  // Strings, or elements such as a select-all checkbox
  headers: ReactNode[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div className="table-scroll">
      <table className="w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={typeof h === "string" ? h : i} style={{textAlign:"left"}}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function TablePagination({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="table-footer">
      <Typography variant="inherit" component="span" tone="muted">
        Showing {total ? (page - 1) * limit + 1 : 0}–
        {Math.min(page * limit, total)} of {total} results
      </Typography>
      <div>
        <Button
          size="sm"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          disabled={page * limit >= total}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-panel" role="status" aria-label="Loading panel">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
