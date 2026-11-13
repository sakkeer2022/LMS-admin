"use client";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MailIcon, MoreHorizontalIcon } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { PersonAvatar } from "@/components/feedback/person-avatar";
import { Tip } from "@/components/feedback/tip";
import { relativeDate } from "@/lib/format/dates";
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
  VERIFICATION_META,
  documentsLabel,
  formatShortDate,
  pricingMeta,
  subjectsLabel,
  tutorDetail,
} from "../schemas/faculty";
import type { FacultyListItem, FacultyRowAction, FacultyRowStatus, PricingStatus, VerificationStatus } from "../types/faculty";

export const FACULTY_TABLE_HEADERS = ["Tutor", "Subjects", "Qualification", "Documents", "Applied", "Verification", "Status", ""];

/** New, Approved, Rejected or Requested for re-upload; nothing for invitations. */
export function VerificationBadge({ status }: { status: VerificationStatus | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const meta = VERIFICATION_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

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

/**
 * Row actions. View opens the verification drawer; Activate / Deactivate is the operational switch, kept
 * apart from verification; the rest wait for their tickets.
 */
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
    row.isActive === false ? item("activate", "Activate") : item("deactivate", "Deactivate"),
    item("delete", "Delete", { destructive: true }),
  ];
}

export function RowActionsMenu({ label, items }: { label: string; items: RowAction[] }) {
  return (
    <DropdownMenu>
      <Tip label="Actions">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
      </Tip>
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
          <div className="flex items-center gap-3">
            <PersonAvatar name={row.fullName ?? row.email} />
            <button
              type="button"
              className="flex min-w-0 max-w-64 flex-col items-start text-left hover:underline focus-visible:underline focus-visible:outline-none"
              onClick={(event) => {
                event.stopPropagation();
                onAction("view", row);
              }}
            >
              <span title={row.fullName ?? row.email} className="max-w-full truncate font-semibold">
                {row.fullName ?? row.email}
              </span>
              <small title={tutorDetail(row, now)} className="max-w-full truncate text-xs text-text-secondary">
                {tutorDetail(row, now)}
              </small>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-muted-foreground">
              <MailIcon className="size-4" />
            </span>
            <div className="flex min-w-0 max-w-64 flex-col">
              <span title={row.email} className="truncate font-semibold">
                {row.email}
              </span>
              <small className="text-xs text-text-secondary">{tutorDetail(row, now)}</small>
            </div>
          </div>
        ),
    },
    { id: "subjects", header: "Subjects", cell: ({ row }) => subjectsLabel(row.original), meta: { className: "whitespace-normal", mobileHideWhen: (row) => row.subjects.length === 0 } },
    {
      id: "qualification",
      header: "Qualification",
      cell: ({ row }) => (
        <span title={row.original.qualification ?? undefined} className="line-clamp-2 max-w-72 text-text-secondary">
          {row.original.qualification ?? "—"}
        </span>
      ),
      meta: { className: "whitespace-normal", mobileHideWhen: (row) => !row.qualification },
    },
    {
      id: "documents",
      header: "Documents",
      cell: ({ row }) => documentsLabel(row.original),
      meta: { mobileHideWhen: (row) => !row.documents },
    },
    {
      id: "applied",
      header: "Applied",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="text-text-secondary">{formatShortDate(row.original.appliedAt, now)}</span>
          <span className="text-xs text-muted-foreground">{relativeDate(row.original.appliedAt)}</span>
        </span>
      ),
    },
    {
      id: "verification",
      header: "Verification",
      cell: ({ row }) => <VerificationBadge status={row.original.verification} />,
      meta: { mobileHideWhen: (row) => !row.verification },
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
        // The menu is inside a clickable row: its clicks must not also open the drawer
        <div onClick={(event) => event.stopPropagation()}>
          <RowActionsMenu label={`Actions for ${row.original.fullName ?? row.original.email}`} items={rowActions(row.original, onAction)} />
        </div>
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
  selectedId,
  onAction,
}: {
  rows: FacultyListItem[];
  caption: string;
  loading?: boolean;
  empty?: ReactNode;
  /** The tutor whose drawer is open */
  selectedId?: string;
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
      onRowClick={(row) => onAction("view", row)}
      canClickRow={(row) => row.kind === "profile"}
      isRowSelected={(row) => row.id === selectedId}
    />
  );
}
