"use client";
import { useEffect, useState } from "react";
import { FileText, NotebookPen } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { SearchInput } from "@/components/forms/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { describeApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/features/faculty/schemas/faculty";
import { SUBMISSION_STATUSES, useSubmissionCounts, useSubmissions, type Submission, type SubmissionFilter } from "../api/library";
import { LibraryReviewSheet } from "./library-review-sheet";

const LIMIT = 20;
const STATUS_LABELS: Record<SubmissionFilter, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  all: "All",
};

export function SubmissionStatusBadge({ status }: { status: Submission["status"] }) {
  return status === "pending" ? (
    <Badge variant="warning">Pending review</Badge>
  ) : status === "approved" ? (
    <Badge variant="success">Approved</Badge>
  ) : (
    <Badge variant="destructive">Rejected</Badge>
  );
}

/**
 * Admin › Categories & content › Library content: files and notes tutors added or edited under their
 * subject cards, waiting for review (decided 2026-11-12; no Figma, F18). Status tabs with counts, a
 * search on title and tutor, and a review sheet to preview the content and approve or reject it.
 */
export function LibraryContentTab() {
  const canModerate = usePermission("library.moderate");
  const [status, setStatus] = useState<SubmissionFilter>("pending");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState<string>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(LIMIT);
  const [openId, setOpenId] = useState<string>();
  const list = useSubmissions({ status, q, page, limit }, canModerate);
  const counts = useSubmissionCounts(q, canModerate);

  // Debounced server-side search; a new search starts on page 1
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim() || undefined;
      if (next !== q) {
        setQ(next);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, q]);

  if (!canModerate) return <PanelMessage>You don&apos;t have permission to review library content.</PanelMessage>;


  const columns: ColumnDef<Submission>[] = [
    {
      id: "resource",
      header: "Resource",
      cell: ({ row: { original: row } }) => (
        <div className="flex min-w-0 items-start gap-2">
          {row.kind === "note" ? (
            <NotebookPen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex max-w-56 min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2 font-medium break-words whitespace-normal">
              {row.title}
              {row.isEdit && <Badge variant="info">Edit</Badge>}
            </span>
            <span className="truncate text-xs text-muted-foreground">{row.kind === "note" ? "Note" : row.file?.name}</span>
          </div>
        </div>
      ),
    },
    {
      id: "tutor",
      header: "Tutor",
      cell: ({ row: { original: row } }) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium">{row.faculty.fullName}</span>
          <span className="max-w-48 truncate text-xs text-muted-foreground" title={row.faculty.email}>{row.faculty.email}</span>
        </div>
      ),
    },
    {
      id: "card",
      header: "Subject card",
      cell: ({ row: { original: row } }) => (
        <div className="flex max-w-64 min-w-0 flex-col">
          <span className="font-medium">{row.card.subject}</span>
          <span className="truncate text-xs text-muted-foreground" title={row.card.pathLabel}>{row.card.pathLabel}</span>
        </div>
      ),
    },
    {
      id: "submitted",
      header: "Submitted",
      cell: ({ row }) => <span className="text-sm text-text-secondary">{formatDateTime(row.original.submittedAt)}</span>,
    },
    { id: "status", header: "Status", cell: ({ row }) => <SubmissionStatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { className: "w-24" },
      cell: ({ row: { original: row } }) => (
        <Button
          size="sm"
          variant={row.status === "pending" ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            setOpenId(row.id);
          }}
          aria-label={`${row.status === "pending" ? "Review" : "View"} ${row.title} by ${row.faculty.fullName}`}
        >
          {row.status === "pending" ? "Review" : "View"}
        </Button>
      ),
    },
  ];

  const countOf = (tab: SubmissionFilter) =>
    !counts.data ? undefined : tab === "all" ? counts.data.pending + counts.data.approved + counts.data.rejected : counts.data[tab];

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-lg font-semibold">Library content</h2>
            <p className="text-xs text-muted-foreground">
              Files and notes tutors add to their subject cards. Nothing is shown to students until it is approved; edits of approved resources are reviewed again.
            </p>
          </div>
          <SearchInput
            label="Search library submissions"
            placeholder="Search title or tutor"
            value={search}
            onChange={setSearch}
            className="w-full sm:w-64"
          />
        </div>
        <Tabs value={status} onValueChange={(next) => { setStatus(next as SubmissionFilter); setPage(1); }} className="px-5">
          <TabsList variant="line" aria-label="Submission status" className="h-auto flex-wrap justify-start">
            {SUBMISSION_STATUSES.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="flex-none px-3">
                {STATUS_LABELS[tab]}
                <Badge variant={status === tab ? "default" : "secondary"} aria-label={countOf(tab) === undefined ? "Loading count" : `${countOf(tab)} submissions`}>
                  {countOf(tab) ?? "…"}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="border-t">
          {list.isError ? (
            <div className="p-5">
              <PanelMessage onRetry={() => void list.refetch()}>
                The submissions could not be loaded. {describeApiError(list.error, "review library content").message}
              </PanelMessage>
            </div>
          ) : (
            <>
              <DataTable
                caption={`${STATUS_LABELS[status]} library submissions, page ${page}`}
                columns={columns}
                data={list.data?.rows ?? []}
                getRowId={(row) => row.id}
                loading={list.isPending}
                loadingRows={5}
                onRowClick={(row) => setOpenId(row.id)}
                isRowSelected={(row) => row.id === openId}
                empty={
                  q
                    ? "Nothing matches your search"
                    : status === "pending"
                      ? "Nothing waiting for review. New files and notes from tutors appear here."
                      : "No submissions here yet"
                }
              />
              {list.data && list.data.rows.length > 0 && (
                <TablePagination
                  noun="submissions"
                  page={page}
                  limit={limit}
                  total={list.data.total}
                  onPage={setPage}
                  onLimit={(next) => {
                    setLimit(next);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      </Card>
      <LibraryReviewSheet submissionId={openId} onClose={() => setOpenId(undefined)} />
    </div>
  );
}
