"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { PanelMessage } from "@/components/layout/panel-message";
import { NoAccess } from "@/components/security/no-access";
import {
  useMyRoles,
  usePermission,
  usePermissions,
} from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Textarea } from "@/components/shadcn/textarea";
import { hasPermission } from "@/lib/auth/access";
import { usePermissionCatalogue, useRole, useRoleMutations } from "./api";
import { PermissionMatrix } from "./permission-matrix";
import { roleLabel, roleSlug } from "./types";

const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/** Create (no `roleId`) or edit a role: name, description and the permission matrix. System roles are read-only. */
export function RoleEditor({ roleId }: { roleId?: string }) {
  const router = useRouter();
  const granted = usePermissions();
  const canRead = usePermission("role.read");
  const canCreate = usePermission("role.create");
  const canUpdate = usePermission("role.update");
  const canAssign = usePermission("role.assign_permission");
  const role = useRole(roleId);
  const catalogue = usePermissionCatalogue(canRead);
  const { create, update, setPermissions } = useRoleMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | undefined>();

  // Fill the form once per loaded role (and again after a save refreshes it)
  const data = role.data;
  const version = data
    ? `${data.id}:${data.name}:${data.description}:${data.permissions
        .map((p) => p.id)
        .sort()
        .join()}`
    : undefined;
  useEffect(() => {
    if (data && version !== loadedFor) {
      setName(roleLabel(data.name));
      setDescription(data.description ?? "");
      setSelected(new Set(data.permissions.map((p) => p.id)));
      setLoadedFor(version);
    }
  }, [data, version, loadedFor]);

  const initialSelected = useMemo(
    () => new Set(data?.permissions.map((p) => p.id) ?? []),
    [data],
  );
  // Nothing to save until an existing role has loaded
  const loaded = !roleId || Boolean(data);
  const isSuper = useMyRoles().includes("super_admin");
  // Super Admin holds everything and is never edited. Other system roles are changed by a Super Admin only,
  // and only in what they can do (not their name or deletion).
  const power = Boolean(data?.isSystem) && data?.name === "super_admin";
  const detailsLocked =
    Boolean(data?.isSystem) || (roleId ? !canUpdate : !canCreate);
  const permsLocked =
    power || (Boolean(data?.isSystem) && !isSuper) || !canAssign;
  const readOnly =
    !loaded || (!roleId && !canCreate) || (detailsLocked && permsLocked);

  const slug = roleSlug(name);
  const nameError = !touched
    ? undefined
    : slug.length < 2
      ? "Give the role a name of at least 2 letters."
      : slug.length > 100
        ? "Keep the name under 100 characters."
        : undefined;
  const dirty =
    !readOnly &&
    (roleId
      ? slug !== data?.name ||
        description !== (data?.description ?? "") ||
        !same(selected, initialSelected)
      : name.trim() !== "" || description !== "" || selected.size > 0);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // What the signed-in admin cannot grant: every permission they do not hold (the API enforces the same)
  const locked = useMemo(
    () =>
      new Set(
        (catalogue.data ?? [])
          .filter((p) => !hasPermission(granted, p.name))
          .map((p) => p.id),
      ),
    [catalogue.data, granted],
  );

  const busy = create.isPending || update.isPending || setPermissions.isPending;

  async function save() {
    setTouched(true);
    if (slug.length < 2 || slug.length > 100) return;
    try {
      let id = roleId;
      if (!id) {
        const created = await create.mutateAsync({
          name: slug,
          ...(description && { description }),
        });
        id = created.id;
      } else if (
        slug !== data?.name ||
        description !== (data?.description ?? "")
      ) {
        await update.mutateAsync({
          id,
          ...(slug !== data?.name && { name: slug }),
          description,
        });
      }
      if (!permsLocked && !same(selected, initialSelected)) {
        await setPermissions.mutateAsync({
          id,
          ids: [...selected],
          current: [...initialSelected],
        });
      }
      toast.success(
        roleId
          ? "Role saved. The change applies to its users now."
          : "Role created",
      );
      if (!roleId) router.replace(`/admin/roles/${id}`);
      else await role.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The role could not be saved",
      );
      // A role created before its permissions failed still exists: continue editing it
      if (!roleId && create.data)
        router.replace(`/admin/roles/${create.data.id}`);
    }
  }

  function discard() {
    setTouched(false);
    setName(data ? roleLabel(data.name) : "");
    setDescription(data?.description ?? "");
    setSelected(new Set(initialSelected));
  }

  if (!canRead) return <NoAccess permission="role.read" />;
  if (roleId && role.isError)
    return (
      <PanelMessage onRetry={() => void role.refetch()}>
        This role could not be loaded.
      </PanelMessage>
    );

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-mb-2 self-start">
        <Link href="/admin/roles">
          <ArrowLeft aria-hidden /> All roles
        </Link>
      </Button>
      <PageHeader
        title={roleId ? (data ? roleLabel(data.name) : "Role") : "New role"}
        description="Choose what people with this role can do. Changes apply to them from their next action."
        actions={
          data?.isSystem && (
            <Badge variant="secondary">
              <Lock aria-hidden /> System role
            </Badge>
          )
        }
      />
      {data?.isSystem && (
        <p
          role="note"
          className="rounded-md border border-info-foreground/20 bg-info-subtle px-4 py-3 text-sm text-info-foreground"
        >
          {power
            ? "Super Admin always holds every permission, including ones added later. It cannot be edited or deleted."
            : isSuper
              ? "This is a system role. You can change what it can do, but not its name, and it cannot be deleted."
              : "This is a system role. Only a Super Admin can change what it can do."}
        </p>
      )}
      <Card className="gap-5 p-5">
        {roleId && role.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={
                <>
                  Name{" "}
                  <span aria-hidden className="text-error-foreground">
                    *
                  </span>
                </>
              }
              hint={
                slug
                  ? `Saved as “${slug}”`
                  : "Letters only, for example Support team"
              }
              error={nameError}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  value={name}
                  disabled={detailsLocked || busy}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => setTouched(true)}
                />
              )}
            </Field>
            <Field
              label="Description"
              hint="Shown to admins when they pick this role"
            >
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  rows={2}
                  maxLength={500}
                  value={description}
                  disabled={detailsLocked || busy}
                  aria-describedby={describedBy}
                  onChange={(event) => setDescription(event.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Permissions</h2>
        <span aria-live="polite" className="text-sm text-text-secondary">
          {selected.size} of {catalogue.data?.length ?? "…"} selected
        </span>
        {dirty && (
          <Badge
            variant="warning"
            className="motion-safe:animate-in motion-safe:fade-in"
          >
            Unsaved changes
          </Badge>
        )}
      </div>
      <PermissionMatrix
        catalogue={catalogue.data}
        selected={selected}
        onChange={(next) => setSelected(next)}
        readOnly={permsLocked}
        locked={locked}
        loading={catalogue.isPending || Boolean(roleId && role.isPending)}
      />
      {catalogue.isError && (
        <PanelMessage onRetry={() => void catalogue.refetch()}>
          The permission list could not be loaded.
        </PanelMessage>
      )}

      {!readOnly && (
        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
          <Button variant="outline" disabled={!dirty || busy} onClick={discard}>
            Discard changes
          </Button>
          <Button disabled={!dirty || busy} onClick={() => void save()}>
            {busy ? "Saving…" : roleId ? "Save changes" : "Create role"}
          </Button>
        </div>
      )}
    </>
  );
}
