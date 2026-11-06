"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontalIcon } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import {
  STATUS_META,
  documentsLabel,
  formatShortDate,
  pricingMeta,
  subjectsLabel,
  tutorDetail,
} from "../schemas/faculty";
import type { FacultyListItem, FacultyRowAction, FacultyRowStatus, PricingStatus } from "../types/faculty";

export const FACULTY_TABLE_HEADERS = ["Tutor", "Subjects", "Qualification", "Documents", "Applied", "Status", ""];

export function FacultyStatusBadge({ status }: { status: FacultyRowStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant}>
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}

export function PricingBadge({ status }: { status: PricingStatus }) {
  const meta = pricingMeta(status);
  return meta ? <Badge variant={meta.variant}>{meta.label}</Badge> : null;
}

export interface RowAction {
  id: FacultyRowAction;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/** Row actions. View opens the verification drawer; the rest wait for their tickets. */
export function rowActions(row: FacultyListItem, onAction: (action: FacultyRowAction, row: FacultyListItem) => void): RowAction[] {
  const item = (id: FacultyRowAction, label: string, extra: Partial<RowAction> = {}): RowAction => ({
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
    item("view", row.status === "pending" ? "Review application" : "View profile"),
    item("edit", "Edit"),
    item("suspend", "Suspend", { disabled: row.status === "suspended" }),
    item("delete", "Delete", { destructive: true }),
  ];
}

export function RowActionsMenu({ label, items }: { label: string; items: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            variant={item.destructive ? "destructive" : "default"}
            disabled={item.disabled}
            onSelect={item.onSelect}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function facultyColumns(
  onAction: (action: FacultyRowAction, row: FacultyListItem) => void,
  now?: Date,
): ColumnDef<FacultyListItem>[] {
  return [
    {
      id: "tutor",
      header: "Tutor",
      cell: ({ row: { original: row } }) =>
        row.kind === "profile" ? (
          <button
            type="button"
            className="flex flex-col items-start text-left hover:underline focus-visible:underline focus-visible:outline-none"
            onClick={() => onAction("view", row)}
          >
            <span className="font-semibold">{row.fullName ?? row.email}</span>
            <small className="text-xs text-muted-foreground">{tutorDetail(row, now)}</small>
          </button>
        ) : (
          <div className="flex flex-col">
            <span className="font-semibold">{row.email}</span>
            <small className="text-xs text-muted-foreground">{tutorDetail(row, now)}</small>
          </div>
        ),
    },
    { id: "subjects", header: "Subjects", cell: ({ row }) => subjectsLabel(row.original), meta: { className: "whitespace-normal" } },
    {
      id: "qualification",
      header: "Qualification",
      cell: ({ row }) => <span className="text-text-secondary">{row.original.qualification ?? "—"}</span>,
      meta: { className: "whitespace-normal" },
    },
    { id: "documents", header: "Documents", cell: ({ row }) => documentsLabel(row.original) },
    {
      id: "applied",
      header: "Applied",
      cell: ({ row }) => <span className="text-text-secondary">{formatShortDate(row.original.appliedAt, now)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          <FacultyStatusBadge status={row.original.status} />
          <PricingBadge status={row.original.pricing} />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActionsMenu label={`Actions for ${row.original.fullName ?? row.original.email}`} items={rowActions(row.original, onAction)} />
      ),
      meta: { className: "w-12" },
    },
  ];
}

export function FacultyTable({
  rows,
  caption,
  loading,
  empty,
  onAction,
}: {
  rows: FacultyListItem[];
  caption: string;
  loading?: boolean;
  empty?: string;
  onAction: (action: FacultyRowAction, row: FacultyListItem) => void;
}) {
  return (
    <DataTable
      caption={caption}
      columns={facultyColumns(onAction)}
      data={rows}
      getRowId={(row) => `${row.kind}-${row.id}`}
      loading={loading}
      loadingRows={7}
      empty={empty}
    />
  );
}
