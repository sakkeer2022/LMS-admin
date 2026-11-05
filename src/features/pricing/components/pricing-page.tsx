"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FormError, SelectField, TextField } from "@/components/forms/field";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Checkbox } from "@/components/shadcn/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { useCategoryTree } from "@/lib/api/category-tree";
import { describeApiError } from "@/lib/api/errors";
import { pickerOfferings, useOfferingTree } from "@/lib/api/offering-tree";
import {
  useBulkUpdatePrices,
  useDeactivatePriceRule,
  usePriceRules,
  type PriceRule,
  type PriceRuleFilters,
} from "@/lib/api/pricing";
import { formatBps, formatPaise, parseRupeesToPaise, previewStudentPays } from "@/lib/currency/money";
import { cn } from "@/lib/utils";
import { bulkRowErrors, dropEdit, editErrors, pendingChanges, setEdit, type PriceEdits } from "../schemas/pricing";
import { AwaitingPrices } from "./awaiting-prices";
import { PriceRuleDrawer, type TutorPricePreset } from "./price-rule-drawer";
import { ResolutionPanel } from "./resolution-panel";

const LIMIT = 20;
const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** Filters live in the URL so a filtered view can be shared. */
function useUrlFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status") ?? "active";
  const filters: PriceRuleFilters = {
    q: params.get("q") ?? undefined,
    categoryId: params.get("category") ?? undefined,
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
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  return { filters, status, search: params.get("q") ?? "", set };
}

type DrawerState = { rule?: PriceRule; preset?: TutorPricePreset };

/** Screen 29: Catalogue → Pricing (LMS-58, LMS-59). */
export function PricingPage() {
  const canRead = usePermission("pricing.read");
  const canManage = usePermission("pricing.manage");
  const canReadCatalogue = usePermission("catalogue.read");
  const { filters, status, search, set } = useUrlFilters();
  const [searchInput, setSearchInput] = useState(search);
  const rules = usePriceRules(filters, canRead);
  const tree = useCategoryTree(canRead && canReadCatalogue);
  const offeringTree = useOfferingTree(canRead && canReadCatalogue);
  const offerings = useMemo(() => pickerOfferings(offeringTree.data), [offeringTree.data]);
  const roots = useMemo(
    () =>
      (tree.data?.nodes ?? [])
        .filter((n) => n.parentId === null)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [tree.data],
  );

  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [deactivating, setDeactivating] = useState<PriceRule | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [edits, setEdits] = useState<PriceEdits>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  // The row whose price was just clicked gets the focus
  const [focusId, setFocusId] = useState<string>();
  const [bulkInput, setBulkInput] = useState("");
  const bulk = useBulkUpdatePrices();
  const changes = pendingChanges(edits);
  const invalid = editErrors(edits);

  // Debounced server-side search
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const t = setTimeout(() => set({ q: searchInput.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!canRead) return <PanelMessage>You don&apos;t have permission to view pricing.</PanelMessage>;

  const rows = rules.data?.rules ?? [];
  const rates = new Set(rows.map((r) => r.amounts.gstRateBps));
  const gstHeader = rates.size === 1 ? `GST ${formatBps([...rates][0])}` : "GST";
  const bulkMode = selected.size > 0;

  const toggleRow = (rule: PriceRule, on: boolean) => {
    const next = new Set(selected);
    if (on) {
      next.add(rule.id);
      setEdits((e) =>
        setEdit(e, rule.id, {
          input: formatPaise(rule.amounts.sessionPricePaise),
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
    setBulkInput("");
    setFocusId(undefined);
  };
  /** Clicking a price selects its row (if needed) and puts the cursor in the amount. */
  const editPrice = (rule: PriceRule) => {
    if (!selected.has(rule.id)) toggleRow(rule, true);
    setFocusId(rule.id);
  };
  const bulkParsed = parseRupeesToPaise(bulkInput);
  const bulkError = bulkInput.trim() && !bulkParsed.ok ? bulkParsed.error : bulkParsed.ok && bulkParsed.paise <= 0 ? "The price must be more than zero" : undefined;
  /** "Set selected to": the same amount on every selected row, still unsaved. */
  const applyToSelected = () => {
    if (!bulkParsed.ok || bulkParsed.paise <= 0) return;
    const input = formatPaise(bulkParsed.paise);
    setEdits((e) => Object.fromEntries(Object.entries(e).map(([id, edit]) => [id, { ...edit, input }])));
    setRowErrors({});
  };
  const requestClear = () => (changes.length ? setConfirmClear(true) : clearSelection());
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const save = async () => {
    if (Object.keys(invalid).length) {
      setRowErrors(invalid);
      return;
    }
    try {
      const saved = await bulk.mutateAsync(changes);
      toast.success(`${saved.length} price change${saved.length === 1 ? "" : "s"} saved`);
      clearSelection();
    } catch (error) {
      // All or nothing: keep every edit and point at the rejected rows
      const described = describeApiError(error, "change prices");
      setRowErrors(bulkRowErrors(described.fields, changes));
      toast.error(described.message);
    }
  };

  const addButton = canManage && (
    <Button onClick={() => setDrawer({})} disabled={!offerings.length}>
      Add price rule
    </Button>
  );

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Pricing"
        description={
          rules.data?.meta
            ? `Session pricing by tutor and category · ${rules.data.meta.total.toLocaleString("en-IN")} pricing rule${rules.data.meta.total === 1 ? "" : "s"}`
            : "Session pricing by tutor and category"
        }
        actions={addButton}
      />
      <AwaitingPrices canManage={canManage} onSetPrice={(preset) => setDrawer({ preset })} />
      {canReadCatalogue && <ResolutionPanel offerings={offerings} />}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Price rules</CardTitle>
            <CardDescription>
              {bulkMode
                ? `Editing ${selected.size} selected rule${selected.size === 1 ? "" : "s"} — GST and student total recalculate on save`
                : "Select rules or click a session price to edit it. Student pays the session price plus GST."}
            </CardDescription>
          </div>
          {bulkMode && (
            <div className="flex flex-wrap items-start gap-2">
              {selected.size > 1 && (
                <form
                  className="flex items-start gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyToSelected();
                  }}
                >
                  <TextField
                    label={`Set the session price of ${selected.size} selected rules`}
                    labelHidden
                    inputMode="decimal"
                    placeholder="Set all to ₹"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    error={bulkError}
                    containerClassName="w-32"
                    className="h-8 text-right"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={!bulkParsed.ok || bulkParsed.paise <= 0}>
                    Apply to {selected.size}
                  </Button>
                </form>
              )}
              <Button size="sm" variant="outline" onClick={requestClear} disabled={bulk.isPending}>
                Clear selection
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Search"
            type="search"
            placeholder="Tutor or category"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <SelectField label="Category" value={filters.categoryId ?? ""} onChange={(e) => set({ category: e.target.value || undefined })}>
            <option value="">All categories</option>
            {roots.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => set({ status: e.target.value === "active" ? undefined : e.target.value })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </SelectField>
        </CardContent>
        {rules.isPending ? (
          <div className="flex flex-col gap-2 px-6 pb-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rules.isError ? (
          <PanelMessage onRetry={() => void rules.refetch()}>
            Price rules could not be loaded. {describeApiError(rules.error, "view pricing").message}
          </PanelMessage>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-6 pb-6">
            <p className="text-sm">
              {filters.q || filters.categoryId ? "No price rules match these filters." : "No price rules yet."}
            </p>
            {addButton}
          </div>
        ) : (
          <>
            <Table>
              <caption className="sr-only">{`Price rules, page ${filters.page}`}</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {canManage && (
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select every rule on this page"
                        checked={allOnPage}
                        onCheckedChange={(checked) =>
                          rows.forEach((r) => selected.has(r.id) !== (checked === true) && toggleRow(r, checked === true))
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead>Tutor</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Session price</TableHead>
                  <TableHead className="text-right">{gstHeader}</TableHead>
                  <TableHead className="text-right">Student pays</TableHead>
                  {canManage && (
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((rule) => (
                  <PriceRow
                    key={rule.id}
                    rule={rule}
                    canManage={canManage}
                    selected={selected.has(rule.id)}
                    edit={edits[rule.id]}
                    error={rowErrors[rule.id]}
                    onToggle={(on) => toggleRow(rule, on)}
                    focus={focusId === rule.id}
                    onEditPrice={() => editPrice(rule)}
                    onInput={(input) => {
                      setEdits((e) => setEdit(e, rule.id, { ...e[rule.id], input }));
                      setRowErrors(({ [rule.id]: _, ...rest }) => rest);
                    }}
                    onEdit={() => setDrawer({ rule })}
                    onDeactivate={() => setDeactivating(rule)}
                  />
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={filters.page}
              limit={LIMIT}
              total={rules.data.meta?.total ?? rows.length}
              noun="price rules"
              onPage={(page) => set({ page: page > 1 ? String(page) : undefined })}
            />
          </>
        )}
        {bulkMode && (
          <div
            className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-accent px-6 py-3"
            role="region"
            aria-label="Unsaved price changes"
          >
            <p className="text-sm text-accent-foreground">
              {changes.length} price change{changes.length === 1 ? "" : "s"} not saved · GST and student totals recalculate on save
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEdits((e) =>
                    Object.fromEntries(
                      Object.entries(e).map(([id, edit]) => [id, { ...edit, input: formatPaise(edit.originalPaise) }]),
                    ),
                  );
                  setRowErrors({});
                  setBulkInput("");
                }}
                disabled={!changes.length || bulk.isPending}
              >
                Discard
              </Button>
              <Button onClick={save} disabled={!changes.length || bulk.isPending}>
                {bulk.isPending ? "Saving…" : `Save ${changes.length} change${changes.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}
      </Card>
      {drawer && (
        <PriceRuleDrawer
          key={drawer.rule?.id ?? drawer.preset?.curriculumId ?? "new"}
          rule={drawer.rule}
          preset={drawer.preset}
          offerings={offerings}
          onClose={() => setDrawer(null)}
        />
      )}
      {deactivating && <DeactivateDialog rule={deactivating} onClose={() => setDeactivating(null)} />}
      <ConfirmDialog
        open={confirmClear}
        title="Discard price changes?"
        description={`${changes.length} price change${changes.length === 1 ? " has" : "s have"} not been saved.`}
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          clearSelection();
        }}
      />
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
  focus,
  onEditPrice,
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
  focus: boolean;
  onEditPrice: () => void;
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
  const tutor = rule.facultyId ? (rule.facultyName ?? "Unknown tutor") : "Default (all tutors)";
  const name = `${tutor}, ${rule.subjectName}`;
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={cn(selected && "bg-accent data-[state=selected]:bg-accent hover:bg-accent", error && "bg-error-subtle")}
    >
      {canManage && (
        <TableCell>
          <Checkbox aria-label={`Select ${name}`} checked={selected} onCheckedChange={(checked) => onToggle(checked === true)} />
        </TableCell>
      )}
      <TableCell className="font-medium">
        <span title={`${effective}. CGST ${formatPaise(rule.amounts.cgstPaise)} + SGST ${formatPaise(rule.amounts.sgstPaise)}.`}>
          {tutor}
        </span>
        {!rule.isActive && (
          <Badge variant="secondary" className="ml-2">
            Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 flex-col">
          <span className="font-medium">{rule.subjectName}</span>
          <span className="truncate text-xs text-muted-foreground" title={rule.pathLabel}>
            {rule.pathLabel}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {selected && edit ? (
          <TextField
            label={`Session price for ${name}`}
            labelHidden
            inputMode="decimal"
            value={edit.input}
            autoFocus={focus}
            onFocus={(e) => focus && e.currentTarget.select()}
            onChange={(e) => onInput(e.target.value)}
            onBlur={() => parsed?.ok && parsed.paise > 0 && onInput(formatPaise(parsed.paise))}
            error={error}
            containerClassName="ml-auto w-28"
            className="text-right font-semibold"
          />
        ) : canManage ? (
          <button
            type="button"
            onClick={onEditPrice}
            aria-label={`Edit session price for ${name}, ${formatPaise(rule.amounts.sessionPricePaise)}`}
            className="ml-auto flex h-9 w-28 items-center justify-end rounded-md border border-border/60 bg-card px-3 text-sm font-semibold hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            {formatPaise(rule.amounts.sessionPricePaise)}
          </button>
        ) : (
          formatPaise(rule.amounts.sessionPricePaise)
        )}
      </TableCell>
      <TableCell className={cn("text-right", preview && "text-muted-foreground")}>{formatPaise(amounts.gstPaise)}</TableCell>
      <TableCell className={cn("text-right font-semibold", preview && "font-normal text-muted-foreground")}>
        {formatPaise(amounts.studentPaysPaise)}
      </TableCell>
      {canManage && (
        <TableCell className="w-12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
              {rule.isActive && (
                <DropdownMenuItem variant="destructive" onSelect={onDeactivate}>
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

function DeactivateDialog({ rule, onClose }: { rule: PriceRule; onClose: () => void }) {
  const deactivate = useDeactivatePriceRule();
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
      open
      title="Deactivate this price rule?"
      description={`${rule.subjectName} (${rule.pathLabel}), ${rule.facultyId ? rule.facultyName : "default price for all tutors"}.`}
      confirmLabel="Deactivate"
      destructive
      pending={deactivate.isPending}
      onCancel={onClose}
      onConfirm={confirm}
    >
      <p className="text-sm text-muted-foreground">
        {rule.facultyId
          ? "The tutor cannot sign in again until this subject card has an active tutor price."
          : "Bookings will fall back to a tutor's own price, or show “price not configured” if there is none."}
      </p>
      <FormError message={error} />
    </ConfirmDialog>
  );
}
