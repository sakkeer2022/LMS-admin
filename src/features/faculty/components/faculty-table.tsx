"use client";
import { Badge, Menu, Typography, type MenuItem } from "@/components/ui";
import { DataTable } from "@/components/ui/dashboard-ui";
import {
  STATUS_META,
  documentsLabel,
  formatShortDate,
  subjectsLabel,
  tutorDetail,
} from "../schemas/faculty";
import type { FacultyListItem, FacultyRowAction, FacultyRowStatus } from "../types/faculty";

export const FACULTY_TABLE_HEADERS = ["Tutor", "Subjects", "Qualification", "Documents", "Applied", "Status", ""];

export function FacultyStatusBadge({ status }: { status: FacultyRowStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} className="faculty-status">
      <span aria-hidden="true">● </span>
      {meta.label}
    </Badge>
  );
}

/** Row actions. Each handler is a placeholder until its ticket lands (see the page). */
export function rowActions(row: FacultyListItem, onAction: (action: FacultyRowAction, row: FacultyListItem) => void): MenuItem[] {
  const item = (id: FacultyRowAction, label: string, extra: Partial<MenuItem> = {}): MenuItem => ({
    id,
    label,
    onSelect: () => onAction(id, row),
    ...extra,
  });
  if (row.kind === "invitation") {
    return [
      item("resend", row.status === "expired" ? "Send a new invitation" : "Resend invitation"),
      item("revoke", "Revoke invitation", { destructive: true, disabled: row.status === "expired" }),
    ];
  }
  return [
    item("view", "View profile"),
    item("edit", "Edit"),
    item("suspend", "Suspend", { disabled: row.status === "suspended" }),
    item("delete", "Delete", { destructive: true }),
  ];
}

export function FacultyRow({
  row,
  onAction,
  now,
}: {
  row: FacultyListItem;
  onAction: (action: FacultyRowAction, row: FacultyListItem) => void;
  now?: Date;
}) {
  const name = row.fullName ?? row.email;
  return (
    <tr>
      <td>
        <strong className="cell-strong">{name}</strong>
        <Typography variant="caption" component="small" tone="muted" className="tutor-email">
          {tutorDetail(row, now)}
        </Typography>
      </td>
      <td className="faculty-wrap">{subjectsLabel(row)}</td>
      <td className="muted faculty-wrap">{row.qualification ?? "—"}</td>
      <td className="faculty-documents">{documentsLabel(row)}</td>
      <td className="muted">{formatShortDate(row.appliedAt, now)}</td>
      <td>
        <FacultyStatusBadge status={row.status} />
      </td>
      <td className="faculty-actions">
        <Menu label={`Actions for ${name}`} items={rowActions(row, onAction)} />
      </td>
    </tr>
  );
}

export function FacultyTable({
  rows,
  caption,
  onAction,
}: {
  rows: FacultyListItem[];
  caption: string;
  onAction: (action: FacultyRowAction, row: FacultyListItem) => void;
}) {
  return (
    <DataTable headers={FACULTY_TABLE_HEADERS} caption={caption}>
      {rows.map((row) => (
        <FacultyRow key={`${row.kind}-${row.id}`} row={row} onAction={onAction} />
      ))}
    </DataTable>
  );
}

/** Loading rows shaped like the table, so the layout does not jump. */
export function FacultyTableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="table-scroll" role="status" aria-label="Loading tutors">
      <table className="w-full text-left" aria-hidden="true">
        <thead>
          <tr>
            {FACULTY_TABLE_HEADERS.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {FACULTY_TABLE_HEADERS.map((_, c) => (
                <td key={c}>
                  <div className="skeleton faculty-skeleton-cell" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
