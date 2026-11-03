"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, Disclosure, FormError, SelectField, Typography } from "@/components/ui";
import { PageHeader, PanelMessage, SectionCard } from "@/components/ui/dashboard-ui";
import { usePermission } from "@/components/security/permission-provider";
import { describeApiError } from "@/lib/api/errors";
import { useCategoryTree } from "@/lib/api/category-tree";
import { useFacultyCounts, useFacultyRoster } from "../api/faculty";
import {
  PAGE_SIZE,
  SORT_LABELS,
  TAB_LABELS,
  filtersFromParams,
  headerSummary,
  rangeLabel,
} from "../schemas/faculty";
import {
  FACULTY_SORTS,
  type FacultyFilters,
  type FacultyListItem,
  type FacultyRowAction,
  type FacultySort,
  type FacultyTab,
} from "../types/faculty";
import { FacultyStatusTabs } from "./faculty-status-tabs";
import { FacultyTable, FacultyTableSkeleton } from "./faculty-table";
import { InviteTutorsModal } from "./invite-tutors-modal";

const PANEL_ID = "faculty-queue-panel";

/** Placeholder handlers for the row menu until each action's ticket lands. */
const ACTION_TICKETS: Record<FacultyRowAction, string> = {
  view: "Tutor profiles arrive with LMS-82 and LMS-85.",
  edit: "Profile editing arrives with LMS-82.",
  suspend: "Suspending tutors arrives with LMS-88.",
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

/** Admin Faculty screen (screen 27, LMS-78): status tabs, onboarding queue, Invite tutor. */
export function FacultyPage({ tenant }: { tenant: string }) {
  const canRead = usePermission("faculty.read");
  const canInvite = usePermission("faculty.create");
  const canReadCatalogue = usePermission("catalogue.read");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const roster = useFacultyRoster(tenant, filters, canRead);
  const counts = useFacultyCounts(tenant, { categoryId: filters.categoryId, search: filters.search }, canRead);
  const tree = useCategoryTree(tenant, canRead && canReadCatalogue);
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
    toast.info(`${row.fullName ?? row.email}: coming soon`, { description: ACTION_TICKETS[action] });
  }

  if (!canRead) return <FormError message="You need the faculty.read permission to view tutors." />;

  const total = roster.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Faculty"
        subtitle={headerSummary(counts.data)}
        action={
          canInvite ? (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              Invite tutor
            </Button>
          ) : undefined
        }
      />

      <FacultyStatusTabs
        value={filters.tab}
        counts={counts.data}
        panelId={PANEL_ID}
        onChange={(tab: FacultyTab) => update({ filter: tab === "all" ? undefined : tab, page: undefined })}
      />

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`faculty-tab-${filters.tab}`} className="faculty-queue">
        <SectionCard
          title="Onboarding queue"
          subtitle="Screening, document verification and category assignment"
          action={
            <div className="faculty-filters">
              <SelectField
                label="Filter by category"
                labelHidden
                containerClassName="faculty-category-filter"
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
              </SelectField>
              <Disclosure className="filter-menu faculty-more-filters" summary="More filters">
                <div className="filter-menu-panel">
                  <SelectField
                    label="Sort by"
                    value={filters.sort}
                    onChange={(event) =>
                      update({
                        sort: event.target.value === "recent" ? undefined : (event.target.value as FacultySort),
                        page: undefined,
                      })
                    }
                  >
                    {FACULTY_SORTS.map((sort) => (
                      <option key={sort} value={sort}>
                        {SORT_LABELS[sort]}
                      </option>
                    ))}
                  </SelectField>
                  {(filters.categoryId || filters.sort !== "recent" || filters.search) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="faculty-clear-filters"
                      onClick={() => update({ category: undefined, sort: undefined, search: undefined, page: undefined })}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </Disclosure>
            </div>
          }
        >
          {roster.isPending ? (
            <FacultyTableSkeleton rows={PAGE_SIZE} />
          ) : roster.isError ? (
            <PanelMessage onRetry={() => void roster.refetch()}>
              {describeApiError(roster.error, "view tutors").message || "Tutors could not be loaded."}
            </PanelMessage>
          ) : roster.data.rows.length === 0 ? (
            <div className="faculty-empty">
              <Typography variant="body2" tone="muted">
                {emptyMessage(filters)}
              </Typography>
              {/* {filters.tab === "all" && !filters.search && !filters.categoryId && canInvite && (
                <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
                  Invite tutor
                </Button>
              )} */}
            </div>
          ) : (
            <div aria-busy={roster.isFetching || undefined} className={roster.isPlaceholderData ? "faculty-refreshing" : undefined}>
              <FacultyTable
                rows={roster.data.rows}
                caption={`Faculty, ${TAB_LABELS[filters.tab]}, page ${filters.page} of ${lastPage}`}
                onAction={onAction}
              />
            </div>
          )}

          {!roster.isPending && !roster.isError && total > 0 && (
            <div className="table-footer faculty-footer">
              <Typography variant="inherit" component="span" tone="muted">
                {rangeLabel(filters.page, total)}
              </Typography>
              <div>
                <Button size="sm" disabled={filters.page <= 1} onClick={() => update({ page: String(filters.page - 1) })}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  disabled={filters.page >= lastPage}
                  onClick={() => update({ page: String(filters.page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {canInvite && <InviteTutorsModal tenant={tenant} open={inviteOpen} onClose={() => setInviteOpen(false)} />}
    </>
  );
}
