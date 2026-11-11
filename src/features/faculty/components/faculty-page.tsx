"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/shadcn/native-select";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { Button } from "@/components/shadcn/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { describeApiError } from "@/lib/api/errors";
import { useCategoryTree } from "@/lib/api/category-tree";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { useFacultyCounts, useFacultyRoster, useSetFacultyActive } from "../api/faculty";
import { PAGE_SIZE, SORT_LABELS, TAB_LABELS, filtersFromParams, headerSummary, rangeLabel } from "../schemas/faculty";
import {
  FACULTY_SORTS,
  type FacultyFilters,
  type FacultyListItem,
  type FacultyRowAction,
  type FacultySort,
  type FacultyTab,
} from "../types/faculty";
import { FacultyReviewDrawer } from "./faculty-review-drawer";
import { FacultyStatusTabs } from "./faculty-status-tabs";
import { FacultyTable } from "./faculty-table";
import { InviteTutorsModal } from "./invite-tutors-modal";

/** Placeholder handlers for the row menu until each action's ticket lands. */
const ACTION_TICKETS: Record<Exclude<FacultyRowAction, "view" | "activate" | "deactivate">, string> = {
  edit: "Profile editing arrives with LMS-82.",
  delete: "Removing tutors is not in Phase 1 scope yet.",
  resend: "Resending invitations arrives with LMS-80.",
  revoke: "Revoking invitations arrives with LMS-80.",
};

export function emptyMessage(filters: FacultyFilters) {
  if (filters.search) return `No tutors match "${filters.search}".`;
  if (filters.categoryId) return "No tutors are assigned to this category yet.";
  if (filters.tab === "all") return "No tutors yet. Invite a tutor to start onboarding.";
  return `No ${TAB_LABELS[filters.tab].toLowerCase()} tutors.`;
}

/** Admin Faculty screen (screen 27, LMS-78): status tabs, onboarding queue, Invite tutor, review drawer (27b). */
export function FacultyPage() {
  const canRead = usePermission("faculty.read");
  const canInvite = usePermission("faculty.create");
  const canReadCatalogue = usePermission("catalogue.read");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const reviewing = params.get("tutor") ?? undefined;
  const [inviteOpen, setInviteOpen] = useState(false);
  const canApprove = usePermission("faculty.approve");
  const setActive = useSetFacultyActive();
  const [deactivating, setDeactivating] = useState<FacultyListItem>();

  function changeActive(row: FacultyListItem, isActive: boolean) {
    const name = row.fullName ?? row.email;
    setActive.mutate(
      { facultyId: row.id, isActive },
      {
        onSuccess: () => {
          setDeactivating(undefined);
          toast.success(isActive ? `${name} is active` : `${name} is inactive`, {
            description: isActive
              ? "They can sign in again once verified and priced."
              : "They cannot sign in and are hidden from students. Their verification is unchanged.",
          });
        },
        onError: (err) => toast.error(describeApiError(err, "change tutor status").message),
      },
    );
  }

  const roster = useFacultyRoster(filters, canRead);
  const counts = useFacultyCounts({ categoryId: filters.categoryId, search: filters.search }, canRead);
  const tree = useCategoryTree(canRead && canReadCatalogue);
  const roots = useMemo(
    () =>
      (tree.data?.nodes ?? [])
        .filter((node) => node.parentId === null && node.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [tree.data],
  );

  function update(values: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function onAction(action: FacultyRowAction, row: FacultyListItem) {
    if (action === "view") return update({ tutor: row.id });
    if (action === "activate" || action === "deactivate") {
      if (!canApprove) return toast.error("You need the faculty.approve permission to change a tutor's status.");
      return action === "activate" ? changeActive(row, true) : setDeactivating(row);
    }
    toast.info(`${row.fullName ?? row.email}: coming soon`, { description: ACTION_TICKETS[action] });
  }

  if (!canRead) return <PanelMessage>You need the faculty.read permission to view tutors.</PanelMessage>;

  const total = roster.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(filters.categoryId || filters.sort !== "recent" || filters.search);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Faculty"
        description={headerSummary(counts.data)}
        actions={canInvite && <Button onClick={() => setInviteOpen(true)}>Invite tutor</Button>}
      />

      <FacultyStatusTabs
        value={filters.tab}
        counts={counts.data}
        onChange={(tab: FacultyTab) => update({ filter: tab === "all" ? undefined : tab, page: undefined })}
      >
        <Card className="gap-0 overflow-hidden pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Onboarding queue</CardTitle>
            <CardDescription>Screening, document verification and category assignment</CardDescription>
            <CardAction className="flex items-center gap-2">
              <div className="w-44">
                <NativeSelect
                  aria-label="Filter by category"
                  value={filters.categoryId ?? ""}
                  disabled={!canReadCatalogue || tree.isError}
                  onChange={(event) => update({ category: event.target.value || undefined, page: undefined })}
                >
                  <option value="">All categories</option>
                  {roots.map((root) => (
                    <option key={root.id} value={root.id}>
                      {root.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal aria-hidden="true" />
                    More filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={filters.sort}
                    onValueChange={(value) => update({ sort: value === "recent" ? undefined : (value as FacultySort), page: undefined })}
                  >
                    {FACULTY_SORTS.map((sort) => (
                      <DropdownMenuRadioItem key={sort} value={sort}>
                        {SORT_LABELS[sort]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  {filtered && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => update({ category: undefined, sort: undefined, search: undefined, page: undefined })}
                      >
                        Clear filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </CardHeader>

          {roster.isError ? (
            <PanelMessage onRetry={() => void roster.refetch()}>
              {describeApiError(roster.error, "view tutors").message || "Tutors could not be loaded."}
            </PanelMessage>
          ) : (
            <div aria-busy={roster.isFetching || undefined} className={roster.isPlaceholderData ? "opacity-60" : undefined}>
              <FacultyTable
                rows={roster.data?.rows ?? []}
                loading={roster.isPending}
                empty={emptyMessage(filters)}
                caption={`Faculty, ${TAB_LABELS[filters.tab]}, page ${filters.page} of ${lastPage}`}
                onAction={onAction}
              />
            </div>
          )}

          {!roster.isPending && !roster.isError && total > 0 && (
            <div className="flex items-center justify-between gap-3 border-t px-6 py-3 text-sm text-muted-foreground">
              <span>{rangeLabel(filters.page, total)}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page <= 1}
                  onClick={() => update({ page: String(filters.page - 1) })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page >= lastPage}
                  onClick={() => update({ page: String(filters.page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </FacultyStatusTabs>

      <ConfirmDialog
        open={Boolean(deactivating)}
        title={`Deactivate ${deactivating?.fullName ?? deactivating?.email ?? "tutor"}?`}
        description="They will not be able to sign in and are hidden from students. Their verification status and documents are kept; you can activate them again at any time."
        confirmLabel="Deactivate"
        destructive
        pending={setActive.isPending}
        onCancel={() => setDeactivating(undefined)}
        onConfirm={() => deactivating && changeActive(deactivating, false)}
      />
      {canInvite && <InviteTutorsModal open={inviteOpen} onClose={() => setInviteOpen(false)} />}
      <FacultyReviewDrawer facultyId={reviewing} onClose={() => update({ tutor: undefined })} />
    </div>
  );
}
