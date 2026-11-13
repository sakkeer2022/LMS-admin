"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderTree,
  Loader2,
  Plus,
  SearchX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { cn as cx } from "@/lib/utils";
import { SearchInput } from "@/components/forms/search-input";
import { Kbd } from "@/components/shadcn/kbd";
import { EmptyState } from "@/components/layout/empty-state";
import { usePermission } from "@/components/security/permission-provider";
import { describeApiError } from "@/lib/api/errors";
import {
  useCategoryTree,
  useRelocateCategory,
  useUpdateCategory,
  type CategoryNode,
} from "@/lib/api/category-tree";
import {
  buildTree,
  expandableIds,
  relocation,
  searchMatches,
  visibleRows,
  type Placement,
} from "@/lib/api/category-tree-model";
import {
  CategoryDetailPanel,
  CategoryForm,
  Rows,
  type PanelMode,
} from "./category-detail-panel";
import { DeleteCategoryDialog } from "./category-dialogs";
import { CategoryTreeList, type TreeRow } from "./category-tree-list";
import { LibraryContentTab } from "@/features/library/components/library-content-tab";

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Admin › Categories & content (screen 28). Categories and sub-categories only: add,
 * rename, enable or disable, delete and reorder. A category without sub-categories is
 * what tutors pick on onboarding, so the tree here is the one they see.
 * The tree is loaded once per session and cached; children render only when expanded.
 * Reorder mode dims the page and makes the tree draggable: drop to reorder siblings, drag
 * right or left to change the parent. Writes are optimistic and roll back when the server
 * refuses them. Selecting a row shows its switch, Edit and Delete; Edit opens the
 * "Edit category" form in the right column.
 */
export function CategoryTreePage() {
  const canRead = usePermission("catalogue.read");
  const canManage = usePermission("catalogue.manage");
  const canModerateLibrary = usePermission("library.moderate");
  // Categories (the tree) or Library content (tutor submissions to review)
  const [tab, setTab] = useState<"categories" | "library">("categories");
  const tree = useCategoryTree(canRead);
  const relocate = useRelocateCategory();
  const update = useUpdateCategory();
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 200);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>();
  const [panel, setPanel] = useState<PanelMode>({ kind: "view" });
  const [deleting, setDeleting] = useState<CategoryNode>();
  const [reorder, setReorder] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "danger" | "info";
    text: string;
    stale?: boolean;
  }>();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const dragging = useRef(false);

  const nodes = useMemo(() => tree.data?.nodes ?? [], [tree.data]);
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  // Search is paused while reordering: a filtered tree would hide drop positions
  const found = useMemo(
    () => (reorder ? null : searchMatches(nodes, q)),
    [nodes, q, reorder],
  );
  const open = useMemo(
    () => (found ? new Set([...expanded, ...found.open]) : expanded),
    [expanded, found],
  );
  const rows: TreeRow[] = useMemo(
    () => visibleRows(roots, open, found?.matches),
    [roots, open, found],
  );
  const selected = nodes.find((n) => n.id === selectedId);
  const allExpandable = useMemo(() => expandableIds(nodes), [nodes]);
  const allOpen =
    allExpandable.length > 0 && allExpandable.every((id) => expanded.has(id));

  // Roots start open, so the first level is visible
  useEffect(() => {
    if (nodes.length && expanded.size === 0)
      setExpanded(new Set(nodes.filter((n) => n.depth === 0).map((n) => n.id)));
  }, [nodes.length]);

  // Escape leaves reorder mode (forms and dialogs are closed while it is on)
  useEffect(() => {
    if (!reorder) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dragging.current) setReorder(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reorder]);

  const report = (error: unknown, action: string) => {
    const described = describeApiError(error, action);
    setNotice({
      tone: "danger",
      text: described.message,
      stale: described.kind === "stale",
    });
  };
  const refresh = () => {
    setNotice(undefined);
    void tree.refetch();
  };
  const select = (node: CategoryNode) => {
    setSelectedId(node.id);
    // Moving to another row leaves an open form
    setPanel((current) =>
      current.kind === "edit" && current.node.id === node.id
        ? current
        : { kind: "view" },
    );
  };
  const edit = (node: CategoryNode) => {
    setSelectedId(node.id);
    setPanel({ kind: "edit", node });
  };
  const addUnder = (parent: CategoryNode | null) =>
    setPanel({ kind: "create", parent });
  const track = (id: string, on: boolean) =>
    setPendingIds((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggle = (id: string, isOpen: boolean) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });

  const onRelocate = (node: CategoryNode, to: Placement) => {
    const change = relocation(nodes, node.id, to);
    if (change.kind === "none") return;
    setNotice(undefined);
    track(node.id, true);
    relocate.mutate(
      { node, to, change },
      {
        onError: (error) => report(error, "move categories"),
        onSettled: () => track(node.id, false),
      },
    );
  };

  const onToggleActive = (node: CategoryNode, isActive: boolean) => {
    track(node.id, true);
    update.mutate(
      { id: node.id, version: node.version, isActive },
      {
        onError: (error) => report(error, "change the status"),
        onSettled: () => track(node.id, false),
      },
    );
  };

  if (!canRead)
    return (
      <PanelMessage>
        You don&apos;t have permission to view the catalogue.
      </PanelMessage>
    );

  const stats = tree.data?.stats;
  const subtitle = stats
    ? `Categories and sub-categories that tutors choose from · ${stats.categories.toLocaleString("en-IN")} categories`
    : "Categories and sub-categories that tutors choose from";

  const treeCard = (
    <Card
      className={cx(
        "relative flex min-w-0 flex-col gap-0 overflow-hidden py-0 transition-shadow duration-200",
        reorder &&
          "z-50 shadow-[0_0_0_2px_var(--primary),0_24px_48px_rgb(15_23_42/0.25)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3 md:flex-nowrap">
        <div className="flex min-w-0 basis-full flex-col gap-0.5 md:basis-auto md:flex-1">
          <h2 className="text-lg font-semibold">Category manager</h2>
          <p className="text-xs text-muted-foreground">
            {reorder
              ? "Drag a row to reorder it. Drag right to nest it, left to move it out."
              : "Organize categories, sub-categories, and nested levels"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!reorder && (
            <SearchInput
              label="Search categories"
              placeholder="Search categories"
              value={search}
              onChange={setSearch}
              className="w-56"
            />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setExpanded(allOpen ? new Set() : new Set(allExpandable))
            }
            disabled={!allExpandable.length}
          >
            {allOpen ? <ChevronsDownUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
          {reorder && (
            <Button size="sm" onClick={() => setReorder(false)}>
              <Check aria-hidden="true" /> Done
            </Button>
          )}
        </div>
      </div>
      {reorder && (
        <p
          id="category-tree-reorder-help"
          className="px-5 pb-2 text-xs text-muted-foreground"
        >
          Keyboard: focus a row, then <Kbd>Alt</Kbd> + <Kbd>↑</Kbd> or{" "}
          <Kbd>↓</Kbd> to reorder, <Kbd>Alt</Kbd> + <Kbd>→</Kbd> to nest under
          the row above, <Kbd>Alt</Kbd> + <Kbd>←</Kbd> to move out.{" "}
          <Kbd>Esc</Kbd> ends reordering.
        </p>
      )}

      <div className="border-t">
        {tree.isPending ? (
          <>
            <p
              role="status"
              className="flex items-center gap-2 border-b border-border-subtle bg-accent/30 px-5 py-2 text-xs font-medium text-accent-foreground"
            >
              <Loader2 aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
              Loading…
            </p>
            <div className="p-5">
              <Rows count={8} />
            </div>
          </>
        ) : tree.isError ? (
          <div className="p-5">
            <PanelMessage onRetry={() => void tree.refetch()}>
              The categories could not be loaded.{" "}
              {describeApiError(tree.error, "view the catalogue").message}
            </PanelMessage>
          </div>
        ) : nodes.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FolderTree}
              title="No categories yet"
              description="Start with a root such as Academic; tutors choose their subjects from this tree."
              action={
                canManage ? (
                  <Button onClick={() => addUnder(null)}>
                    <Plus aria-hidden /> Add category
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={SearchX}
              title={`Nothing matches “${q}”`}
              description="Try a different word, or clear the search to see every category."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          </div>
        ) : (
          <CategoryTreeList
            rows={rows}
            nodes={nodes}
            expanded={open}
            onToggle={toggle}
            selectedId={selectedId}
            onSelect={select}
            reorder={reorder}
            onRelocate={onRelocate}
            onInvalidDrop={(text) => setNotice({ tone: "danger", text })}
            canManage={canManage}
            pendingIds={pendingIds}
            onEdit={edit}
            onDelete={setDeleting}
            onToggleActive={onToggleActive}
            onDraggingChange={(value) => {
              dragging.current = value;
            }}
          />
        )}
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Reorder mode: dim everything except the tree and the Reorder toggle */}
      <div
        aria-hidden="true"
        className={cx(
          "fixed inset-0 z-40 bg-[rgb(15_23_42/0.38)] transition-opacity duration-200",
          reorder
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <PageHeader
        title="Categories & content"
        description={
          tab === "library"
            ? "Review the files and notes tutors add to their subject cards"
            : subtitle
        }
        actions={
          canManage &&
          tab === "categories" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setReorder((r) => !r);
                  setPanel({ kind: "view" });
                  setDeleting(undefined);
                }}
                aria-pressed={reorder}
                disabled={!nodes.length}
                className={cx(
                  "relative",
                  reorder && "z-50 border-primary text-primary",
                )}
              >
                <ArrowUpDown aria-hidden />
                {reorder ? "Done reordering" : "Reorder"}
              </Button>
              <Button
                inert={reorder}
                title="Add a top-level category"
                onClick={() => addUnder(null)}
              >
                <Plus aria-hidden />
                Add category
              </Button>
            </>
          )
        }
      />

      {notice && (
        <Card
          className={cx(
            "relative flex-row flex-wrap items-center gap-3 p-3",
            reorder && "z-50",
          )}
          role="alert"
        >
          <p
            className={cx(
              "flex items-center gap-2 text-sm",
              notice.tone === "danger" && "text-error-foreground",
            )}
          >
            <AlertTriangle aria-hidden className="size-4 shrink-0" />
            {notice.text}
          </p>
          {notice.stale && (
            <Button size="sm" variant="outline" onClick={refresh}>
              Reload
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setNotice(undefined)}
          >
            Dismiss
          </Button>
        </Card>
      )}

      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next === "library" ? "library" : "categories");
          setReorder(false);
        }}
      >
        <TabsList aria-label="Categories and content">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          {canModerateLibrary && (
            <TabsTrigger value="library">Library content</TabsTrigger>
          )}
        </TabsList>
        {canModerateLibrary && (
          <TabsContent value="library">
            <LibraryContentTab />
          </TabsContent>
        )}
        <TabsContent value="categories">
          <div className="grid items-start gap-4 pt-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
            {treeCard}
            <div className="min-w-0" inert={reorder}>
              {panel.kind === "view" || !canManage ? (
                <CategoryDetailPanel
                  node={selected}
                  canManage={canManage}
                  pending={selected ? pendingIds.has(selected.id) : false}
                  onAddChild={addUnder}
                  onEdit={edit}
                  onDelete={setDeleting}
                  onToggleActive={onToggleActive}
                />
              ) : (
                <CategoryForm
                  key={
                    panel.kind === "edit"
                      ? `edit-${panel.node.id}`
                      : `create-${panel.parent?.id ?? "root"}`
                  }
                  mode={
                    panel.kind === "edit"
                      ? {
                          kind: "edit",
                          node:
                            nodes.find((n) => n.id === panel.node.id) ??
                            panel.node,
                        }
                      : panel
                  }
                  nodes={nodes}
                  onCancel={() => setPanel({ kind: "view" })}
                  onSaved={(id) => {
                    if (panel.kind === "create" && panel.parent)
                      toggle(panel.parent.id, true);
                    setSelectedId(id);
                    setPanel({ kind: "view" });
                  }}
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {deleting && (
        <DeleteCategoryDialog
          node={nodes.find((n) => n.id === deleting.id) ?? deleting}
          onClose={() => setDeleting(undefined)}
          onDeleted={() => {
            setDeleting(undefined);
            setSelectedId(undefined);
            setPanel({ kind: "view" });
          }}
        />
      )}
    </div>
  );
}
