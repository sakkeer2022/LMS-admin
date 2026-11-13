"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Layers, SlidersHorizontal, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { FilterChip } from "@/components/feedback/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { TablePagination } from "@/components/data-table/table-pagination";
import { SearchInput } from "@/components/forms/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { describeApiError } from "@/lib/api/errors";
import { useCategoryTree } from "@/lib/api/category-tree";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { useFacultyCounts, useFacultyRoster, useSetFacultyActive } from "../api/faculty";
import { PAGE_SIZE, SORT_LABELS, TAB_LABELS, filtersFromParams, headerSummary } from "../schemas/faculty";
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

  // The search box is typed locally and pushed to the URL after a pause; `pushed` stops the URL's echo
  // from overwriting what was typed in the meantime
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const pushed = useRef(filters.search ?? "");
  useEffect(() => {
    if ((filters.search ?? "") !== pushed.current) {
      pushed.current = filters.search ?? "";
      setSearchInput(pushed.current);
    }
  }, [filters.search]);
  useEffect(() => {
    const next = searchInput.trim();
    if (next === pushed.current) return;
    const timer = setTimeout(() => {
      pushed.current = next;
      update({ search: next || undefined, page: undefined });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  const onSearch = (value: string) => setSearchInput(value);

  function clearFilters() {
    pushed.current = "";
    setSearchInput("");
    update({ category: undefined, sort: undefined, search: undefined, page: undefined });
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
  const lastPage = Math.max(1, Math.ceil(total / filters.limit));
  const filtered = Boolean(filters.categoryId || filters.sort !== "recent" || filters.search);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Faculty"
        description={headerSummary(counts.data)}
        actions={
          canInvite && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus aria-hidden />
              Invite tutor
            </Button>
          )
        }
      />

      <FacultyStatusTabs
        value={filters.tab}
        counts={counts.data}
        onChange={(tab: FacultyTab) => update({ filter: tab === "all" ? undefined : tab, page: undefined })}
      >
        <Card className="gap-0 overflow-hidden">
          {/* The same toolbar as every listing: search, filters, then the active filters as chips */}
          <div className="flex flex-col gap-3 border-b border-border-subtle p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <SearchInput
                value={searchInput}
                onChange={onSearch}
                label="Search tutors"
                placeholder="Search name or email"
                className="sm:w-72"
              />
              {/* Radix Select cannot hold an empty value, so "no category" is the word "all" */}
              <Select
                value={filters.categoryId ?? "all"}
                disabled={!canReadCatalogue || tree.isError}
                onValueChange={(value) => update({ category: value === "all" ? undefined : value, page: undefined })}
              >
                <SelectTrigger
                  aria-label="Filter by category"
                  className={cn("w-full bg-card sm:w-48 data-[size=default]:h-10", filters.categoryId && "border-primary bg-accent/40 font-medium")}
                >
                  <Layers aria-hidden className={cn(filters.categoryId && "text-primary!")} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  <SelectItem value="all">All categories</SelectItem>
                  {roots.map((root) => (
                    <SelectItem key={root.id} value={root.id}>
                      {root.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal aria-hidden="true" />
                    More filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
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
                </DropdownMenuContent>
              </DropdownMenu>
              {filtered && (
                <Button variant="ghost" className="text-text-secondary sm:ml-auto" onClick={clearFilters}>
                  <X aria-hidden /> Clear filters
                </Button>
              )}
            </div>
            {(filters.categoryId || filters.sort !== "recent") && (
              <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
                {filters.categoryId && (
                  <FilterChip
                    label={roots.find((root) => root.id === filters.categoryId)?.name ?? "Category"}
                    onRemove={() => update({ category: undefined, page: undefined })}
                  />
                )}
                {filters.sort !== "recent" && (
                  <FilterChip
                    label={`Sorted: ${SORT_LABELS[filters.sort]}`}
                    onRemove={() => update({ sort: undefined, page: undefined })}
                  />
                )}
              </ul>
            )}
          </div>

          {roster.isError ? (
            <PanelMessage onRetry={() => void roster.refetch()}>
              {describeApiError(roster.error, "view tutors").message || "Tutors could not be loaded."}
            </PanelMessage>
          ) : (
            <div aria-busy={roster.isFetching || undefined} className={roster.isPlaceholderData ? "opacity-60" : undefined}>
              <FacultyTable
                rows={roster.data?.rows ?? []}
                loading={roster.isPending}
                empty={
                  filtered ? (
                    <>
                      {emptyMessage(filters)}
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    emptyMessage(filters)
                  )
                }
                selectedId={reviewing}
                caption={`Faculty, ${TAB_LABELS[filters.tab]}, page ${filters.page} of ${lastPage}`}
                onAction={onAction}
              />
            </div>
          )}

          {!roster.isPending && !roster.isError && total > 0 && (
            <TablePagination
              noun="tutors"
              page={filters.page}
              limit={filters.limit}
              total={total}
              onPage={(page) => update({ page: String(page) })}
              onLimit={(limit) => update({ limit: limit === PAGE_SIZE ? undefined : String(limit), page: undefined })}
            />
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
