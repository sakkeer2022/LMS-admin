"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, SearchX, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { NoAccess } from "@/components/security/no-access";
import {
  useMyRoles,
  usePermission,
} from "@/components/security/permission-provider";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { cn } from "@/lib/utils";
import { usePermissionCatalogue, useRoleMutations, useRoles } from "./api";
import { RoleCard } from "./role-card";
import { roleLabel, type RoleSummary } from "./types";

type Show = "all" | "active" | "inactive";
const SHOW: { id: Show; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];
const rank = (r: RoleSummary) =>
  r.name === "super_admin" && r.isSystem ? 0 : r.isSystem ? 1 : 2;

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function RolesPage() {
  const router = useRouter();
  const canRead = usePermission("role.read");
  const canCreate = usePermission("role.create");
  const canUpdate = usePermission("role.update");
  const canDelete = usePermission("role.delete");
  const myRoles = useMyRoles();
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<Show>("all");
  const q = useDebounced(search.trim());
  const query = useRoles({ page: 1, limit: 100, search: q }, canRead);
  const catalogue = usePermissionCatalogue(canRead);
  const { update, remove } = useRoleMutations();
  const [deleting, setDeleting] = useState<RoleSummary | null>(null);

  const total = catalogue.data?.length ?? 0;
  const roles = useMemo(
    () =>
      (query.data?.data ?? [])
        .filter((r) =>
          show === "all" ? true : show === "active" ? r.isActive : !r.isActive,
        )
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)),
    [query.data, show],
  );
  const mine = roles.filter((r) => myRoles.includes(r.name));
  const isSuper = myRoles.includes("super_admin");

  if (!canRead) return <NoAccess permission="role.read" />;

  const actionsFor = (role: RoleSummary) => {
    const power = role.isSystem && role.name === "super_admin";
    const editable = canUpdate && !power && (!role.isSystem || isSuper);
    return [
      {
        id: "open",
        label: editable ? "Edit" : "View",
        onSelect: () => router.push(`/admin/roles/${role.id}`),
      },
      ...(!role.isSystem && canUpdate
        ? [
            {
              id: "toggle",
              label: role.isActive ? "Deactivate" : "Activate",
              onSelect: () =>
                update.mutate(
                  { id: role.id, isActive: !role.isActive },
                  {
                    onSuccess: () =>
                      toast.success(
                        role.isActive
                          ? `${roleLabel(role.name)} deactivated. Its people lose these permissions now.`
                          : `${roleLabel(role.name)} activated`,
                      ),
                    onError: (error) => toast.error(error.message),
                  },
                ),
            },
          ]
        : []),
      ...(!role.isSystem && canDelete
        ? [
            {
              id: "delete",
              label: "Delete",
              destructive: true,
              onSelect: () => setDeleting(role),
            },
          ]
        : []),
    ];
  };

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a set of things people are allowed to do. Give someone one or more roles."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/admin/roles/new">
                <Plus aria-hidden /> New role
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Search roles"
          placeholder="Search roles"
          className="w-full sm:w-72"
          value={search}
          onChange={setSearch}
        />
        <div
          role="group"
          aria-label="Show roles"
          className="inline-flex rounded-md border bg-card p-0.5"
        >
          {SHOW.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={show === id}
              onClick={() => setShow(id)}
              className={cn(
                "rounded-[4px] px-3 py-1.5 text-sm font-semibold text-text-secondary outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                show === id && "bg-accent text-accent-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {query.isError ? (
        <PanelMessage onRetry={() => void query.refetch()}>
          Roles could not be loaded.
        </PanelMessage>
      ) : query.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={q || show !== "all" ? SearchX : ShieldCheck}
          title={q || show !== "all" ? "No roles match" : "No roles yet"}
          description={
            q || show !== "all"
              ? "Try a different word, or show all roles."
              : "Create a role to start giving people access."
          }
          action={
            q || show !== "all" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setShow("all");
                }}
              >
                Show all roles
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul
          aria-label="Roles"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {roles.map((role, i) => (
            <li
              key={role.id}
              className="flex"
            >
              <RoleCard
                role={role}
                total={total}
                mine={mine.includes(role)}
                index={i}
                actions={actionsFor(role)}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting ? roleLabel(deleting.name) : "role"}?`}
        description={
          deleting && deleting.userCount > 0
            ? `${deleting.userCount} ${deleting.userCount === 1 ? "person has" : "people have"} this role. Remove it from them first, then delete it.`
            : "This cannot be undone."
        }
        confirmLabel="Delete role"
        destructive
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`${roleLabel(deleting.name)} deleted`);
              setDeleting(null);
            },
            onError: (error) => {
              toast.error(error.message);
              setDeleting(null);
            },
          })
        }
      />
    </>
  );
}
