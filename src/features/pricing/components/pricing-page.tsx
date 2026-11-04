"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  FormError,
  Menu,
  SelectField,
  TextField,
  Typography,
} from "@/components/ui";
import {
  DataTable,
  PageHeader,
  PanelMessage,
  PanelSkeleton,
  StatusBadge,
  TablePagination,
} from "@/components/ui/dashboard-ui";
import { usePermission } from "@/components/security/permission-provider";
import {
  useCatalogueTrees,
  useCategories,
  useSubjects,
} from "@/lib/api/catalogue";
import { offeringsFromTrees } from "@/lib/api/catalogue-tree";
import { describeApiError } from "@/lib/api/errors";
import {
  useBulkUpdatePrices,
  useDeactivatePriceRule,
  usePriceRules,
  type PriceRule,
  type PriceRuleFilters,
} from "@/lib/api/pricing";
import {
  formatBps,
  formatPaise,
  paiseToRupeesInput,
  parseRupeesToPaise,
  previewStudentPays,
} from "@/lib/currency/money";
import {
  bulkRowErrors,
  dropEdit,
  editErrors,
  pendingChanges,
  setEdit,
  type PriceEdits,
} from "../schemas/pricing";
import { PriceRuleDrawer } from "./price-rule-drawer";
import { ResolutionPanel } from "./resolution-panel";

const LIMIT = 20;
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

/** Filters live in the URL so a filtered view can be shared. */
function useUrlFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status") ?? "active";
  const filters: PriceRuleFilters = {
    q: params.get("q") ?? undefined,
    categoryId: params.get("category") ?? undefined,
    subjectId: params.get("subject") ?? undefined,
    isActive: status === "all" ? undefined : status === "active",
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: LIMIT,
  };
  const set = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes))
      if (value) next.set(key, value);
      else next.delete(key);
    if (!("page" in changes)) next.delete("page");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };
  return { filters, status, search: params.get("q") ?? "", set };
}

/** Screen 29 and 29b: Catalogue → Pricing (LMS-59). */
export function PricingPage({ tenant }: { tenant: string }) {
  const canRead = usePermission("pricing.read");
  const canManage = usePermission("pricing.manage");
  const canReadCatalogue = usePermission("catalogue.read");
  const { filters, status, search, set } = useUrlFilters();
  const [searchInput, setSearchInput] = useState(search);
  const rules = usePriceRules(tenant, filters, canRead);
  const categories = useCategories(tenant);
  const subjects = useSubjects(tenant);
  const trees = useCatalogueTrees(
    tenant,
    canReadCatalogue ? (categories.data?.map((c) => c.id) ?? []) : [],
  );
  const offerings = useMemo(
    () =>
      offeringsFromTrees(
        trees.flatMap((t) => (t.data ? [t.data] : [])),
        categories.data ?? [],
      ),
    [trees, categories.data],
  );

  const [drawer, setDrawer] = useState<{ rule?: PriceRule } | null>(null);
  const [deactivating, setDeactivating] = useState<PriceRule | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [edits, setEdits] = useState<PriceEdits>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const bulk = useBulkUpdatePrices(tenant);
  const changes = pendingChanges(edits);
  const invalid = editErrors(edits);

  // Debounced server-side search
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const t = setTimeout(
      () => set({ q: searchInput.trim() || undefined }),
      300,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  // Leaving with unsaved price edits asks first. (The App Router has no in-app navigation guard.)
  useEffect(() => {
    if (!changes.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  if (!canRead)
    return (
      <PanelMessage>
        You don&apos;t have permission to view pricing.
      </PanelMessage>
    );

  const rows = rules.data?.rules ?? [];
  const rates = new Set(rows.map((r) => r.amounts.gstRateBps));
  const gstHeader =
    rates.size === 1 ? `GST ${formatBps([...rates][0])}` : "GST";
  const bulkMode = selected.size > 0;

  const toggleRow = (rule: PriceRule, on: boolean) => {
    const next = new Set(selected);
    if (on) {
      next.add(rule.id);
      setEdits((e) =>
        setEdit(e, rule.id, {
          input: paiseToRupeesInput(rule.amounts.sessionPricePaise),
          originalPaise: rule.amounts.sessionPricePaise,
          revision: rule.revision,
        }),
      );
    } else {
      next.delete(rule.id);
      setEdits((e) => dropEdit(e, rule.id));
      setRowErrors(({ [rule.id]: _, ...rest }) => rest);
    }
    setSelected(next);
  };
  const clearSelection = () => {
    setSelected(new Set());
    setEdits({});
    setRowErrors({});
  };
  const requestClear = () =>
    changes.length ? setConfirmClear(true) : clearSelection();
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const save = async () => {
    if (Object.keys(invalid).length) {
      setRowErrors(invalid);
      return;
    }
    try {
      const saved = await bulk.mutateAsync(changes);
      toast.success(
        `${saved.length} price change${saved.length === 1 ? "" : "s"} saved`,
      );
      clearSelection();
    } catch (error) {
      // All or nothing: keep every edit and point at the rejected rows
      const described = describeApiError(error, "change prices");
      setRowErrors(bulkRowErrors(described.fields, changes));
      toast.error(described.message);
    }
  };

  const header = (
    <PageHeader
      title="Pricing"
      subtitle={
        rules.data?.meta
          ? `${rules.data.meta.total} price rule${rules.data.meta.total === 1 ? "" : "s"}`
          : "Session prices by tutor and offering"
      }
      action={
        canManage && (
          <Button
            variant="primary"
            onClick={() => setDrawer({})}
            disabled={!offerings.length}
          >
            Add price rule
          </Button>
        )
      }
    />
  );

  return (
    <div className="flex flex-col gap-4 pb-20">
      {header}
      {canReadCatalogue && (
        <ResolutionPanel tenant={tenant} offerings={offerings} />
      )}
      <Card className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <Typography variant="h2">Price rules</Typography>
          <Typography variant="caption" tone="muted" component="p">
            {bulkMode
              ? `Editing ${selected.size} selected rule${selected.size === 1 ? "" : "s"}; GST and student totals recalculate on save`
              : "Student pays the session price plus GST (CGST + SGST split shown in the rule details)"}
          </Typography>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Search"
            type="search"
            placeholder="Tutor, subject, board or level"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <SelectField
            label="Category"
            value={filters.categoryId ?? ""}
            onChange={(e) => set({ category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Subject"
            value={filters.subjectId ?? ""}
            onChange={(e) => set({ subject: e.target.value || undefined })}
          >
            <option value="">All subjects</option>
            {subjects.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={status}
            onChange={(e) =>
              set({
                status:
                  e.target.value === "active" ? undefined : e.target.value,
              })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </SelectField>
        </div>
        {rules.isPending ? (
          <PanelSkeleton rows={6} />
        ) : rules.isError ? (
          <PanelMessage onRetry={() => void rules.refetch()}>
            Price rules could not be loaded.{" "}
            {describeApiError(rules.error, "view pricing").message}
          </PanelMessage>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <Typography>
              {filters.q || filters.categoryId || filters.subjectId
                ? "No price rules match these filters."
                : "No price rules yet."}
            </Typography>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => setDrawer({})}
                disabled={!offerings.length}
              >
                Add price rule
              </Button>
            )}
          </div>
        ) : (
          <>
            <DataTable
              caption={`Price rules, page ${filters.page}`}
              headers={[
                ...(canManage
                  ? [
                      <Checkbox
                        key="all"
                        aria-label="Select every rule on this page"
                        checked={allOnPage}
                        onChange={(e) =>
                          rows.forEach(
                            (r) =>
                              selected.has(r.id) !== e.target.checked &&
                              toggleRow(r, e.target.checked),
                          )
                        }
                      />,
                    ]
                  : []),
                "Tutor",
                "Subject",
                "Category · Board",
                "Level",
                "Session price",
                gstHeader,
                "Student pays",
                "Status",
                ...(canManage
                  ? [
                      <span key="a" className="sr-only">
                        Actions
                      </span>,
                    ]
                  : []),
              ]}
            >
              {rows.map((rule) => (
                <PriceRow
                  key={rule.id}
                  rule={rule}
                  canManage={canManage}
                  selected={selected.has(rule.id)}
                  edit={edits[rule.id]}
                  error={rowErrors[rule.id]}
                  onToggle={(on) => toggleRow(rule, on)}
                  onInput={(input) => {
                    setEdits((e) =>
                      setEdit(e, rule.id, { ...e[rule.id], input }),
                    );
                    setRowErrors(({ [rule.id]: _, ...rest }) => rest);
                  }}
                  onEdit={() => setDrawer({ rule })}
                  onDeactivate={() => setDeactivating(rule)}
                />
              ))}
            </DataTable>
            <TablePagination
              page={filters.page}
              limit={LIMIT}
              total={rules.data.meta?.total ?? rows.length}
              onPage={(page) =>
                set({ page: page > 1 ? String(page) : undefined })
              }
            />
          </>
        )}
      </Card>
      {bulkMode && (
        <div
          className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg"
          role="region"
          aria-label="Unsaved price changes"
        >
          <Typography variant="body2">
            {changes.length} price change{changes.length === 1 ? "" : "s"} not
            saved
          </Typography>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={requestClear}
              disabled={bulk.isPending}
            >
              Clear selection
            </Button>
            <Button
              onClick={() => {
                setEdits((e) =>
                  Object.fromEntries(
                    Object.entries(e).map(([id, edit]) => [
                      id,
                      {
                        ...edit,
                        input: paiseToRupeesInput(edit.originalPaise),
                      },
                    ]),
                  ),
                );
                setRowErrors({});
              }}
              disabled={!changes.length || bulk.isPending}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              onClick={save}
              disabled={!changes.length}
              pending={bulk.isPending}
              pendingLabel="Saving…"
            >
              Save {changes.length} change{changes.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
      {drawer && (
        <PriceRuleDrawer
          key={drawer.rule?.id ?? "new"}
          tenant={tenant}
          rule={drawer.rule}
          offerings={offerings}
          onClose={() => setDrawer(null)}
        />
      )}
      {deactivating && (
        <DeactivateDialog
          tenant={tenant}
          rule={deactivating}
          onClose={() => setDeactivating(null)}
        />
      )}
      {confirmClear && (
        <ConfirmDialog
          title="Discard price changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          destructive
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setConfirmClear(false);
            clearSelection();
          }}
        >
          <Typography>
            {changes.length} price change
            {changes.length === 1 ? " has" : "s have"} not been saved.
          </Typography>
        </ConfirmDialog>
      )}
    </div>
  );
}

function PriceRow({
  rule,
  canManage,
  selected,
  edit,
  error,
  onToggle,
  onInput,
  onEdit,
  onDeactivate,
}: {
  rule: PriceRule;
  canManage: boolean;
  selected: boolean;
  edit?: { input: string; originalPaise: number };
  error?: string;
  onToggle: (on: boolean) => void;
  onInput: (value: string) => void;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const parsed = edit ? parseRupeesToPaise(edit.input) : undefined;
  // Edited rows show a muted preview; saved rows show the server's amounts
  const preview =
    parsed?.ok && parsed.paise > 0 && parsed.paise !== edit!.originalPaise
      ? previewStudentPays(parsed.paise, rule.amounts.gstRateBps)
      : null;
  const amounts = preview ?? rule.amounts;
  const effective = `From ${dateFormat.format(new Date(rule.effectiveFrom))}${rule.effectiveTo ? ` to ${dateFormat.format(new Date(rule.effectiveTo))}` : ", no end date"}`;
  return (
    <tr
      aria-selected={selected || undefined}
      className={error ? "bg-[var(--danger-bg)]" : undefined}
    >
      {canManage && (
        <td>
          <Checkbox
            aria-label={`Select ${rule.subjectName} ${rule.levelName}`}
            checked={selected}
            onChange={(e) => onToggle(e.target.checked)}
          />
        </td>
      )}
      <td>
        {rule.facultyId
          ? (rule.facultyName ?? "Unknown tutor")
          : "Default (all tutors)"}
      </td>
      <td>{rule.subjectName}</td>
      <td>{[rule.categoryName, rule.boardName].filter(Boolean).join(" · ")}</td>
      <td>{rule.levelName}</td>
      <td>
        {selected && edit ? (
          <TextField
            label={`Session price for ${rule.subjectName} ${rule.levelName}`}
            labelHidden
            inputMode="decimal"
            value={edit.input}
            onChange={(e) => onInput(e.target.value)}
            error={error}
            containerClassName="min-w-[110px]"
          />
        ) : (
          formatPaise(rule.amounts.sessionPricePaise)
        )}
      </td>
      <td>
        <Typography
          component="span"
          variant="body2"
          tone={preview ? "muted" : "default"}
        >
          {formatPaise(amounts.gstPaise)}
        </Typography>
      </td>
      <td>
        <Typography
          component="span"
          variant="body2"
          tone={preview ? "muted" : "default"}
        >
          {formatPaise(amounts.studentPaysPaise)}
        </Typography>
      </td>
      <td>
        <span
          title={`${effective}. CGST ${formatPaise(rule.amounts.cgstPaise)} + SGST ${formatPaise(rule.amounts.sgstPaise)}.`}
        >
          <StatusBadge status={rule.isActive ? "Active" : "Inactive"} />
        </span>
      </td>
      {canManage && (
        <td>
          <Menu
            label={`Actions for ${rule.subjectName} ${rule.levelName}`}
            items={[
              { id: "edit", label: "Edit", onSelect: onEdit },
              ...(rule.isActive
                ? [
                    {
                      id: "deactivate",
                      label: "Deactivate",
                      onSelect: onDeactivate,
                      destructive: true,
                    },
                  ]
                : []),
            ]}
          />
        </td>
      )}
    </tr>
  );
}

function DeactivateDialog({
  tenant,
  rule,
  onClose,
}: {
  tenant: string;
  rule: PriceRule;
  onClose: () => void;
}) {
  const deactivate = useDeactivatePriceRule(tenant);
  const [error, setError] = useState<string>();
  const confirm = async () => {
    try {
      await deactivate.mutateAsync(rule);
      toast.success("Price rule deactivated");
      onClose();
    } catch (e) {
      setError(describeApiError(e, "change prices").message);
    }
  };
  return (
    <ConfirmDialog
      title="Deactivate this price rule?"
      confirmLabel="Deactivate"
      destructive
      pending={deactivate.isPending}
      onCancel={onClose}
      onConfirm={confirm}
    >
      <Typography>
        {[rule.subjectName, rule.levelName, rule.boardName]
          .filter(Boolean)
          .join(" · ")}
        , {rule.facultyId ? rule.facultyName : "default price for all tutors"}.
      </Typography>
      <Typography variant="body2" tone="muted">
        Bookings will fall back to the default price, or show “price not
        configured” if there is none.
      </Typography>
      <FormError message={error} />
    </ConfirmDialog>
  );
}
