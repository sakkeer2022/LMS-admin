"use client";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useMe } from "@/features/auth/api/auth";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/feedback/person-avatar";
import { StatusBadge } from "@/components/feedback/status-badge";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { TextField } from "@/components/forms/field";
import { PanelMessage } from "@/components/layout/panel-message";
import { usePermission } from "@/components/security/permission-provider";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Switch } from "@/components/shadcn/switch";
import { useRoleOptions } from "@/features/roles/api";
import { roleLabel } from "@/features/roles/types";
import { useUser, useUserMutations } from "../api/users";

export function UserSheet({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const canUpdate = usePermission("user.update");
  const canAssign = usePermission("user.assign_role");
  const canSeeRoles = usePermission("role.read");
  const user = useUser(userId);
  const roles = useRoleOptions(canSeeRoles && userId !== null);
  const { update, setRoles, resetPassword } = useUserMutations();
  const me = useMe().data?.data;
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [confirmOff, setConfirmOff] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const data = user.data;
  const held = useMemo(
    () => new Set(data?.roles.map((r) => r.id) ?? []),
    [data],
  );
  useEffect(() => {
    if (data) {
      setName(data.fullName);
      setPicked(new Set(data.roles.map((r) => r.id)));
    }
  }, [data]);

  const nameDirty = data !== undefined && name.trim() !== data.fullName;
  const rolesDirty =
    picked.size !== held.size || [...picked].some((id) => !held.has(id));
  const fail = (error: Error) => toast.error(error.message);

  function setActive(isActive: boolean) {
    if (!data) return;
    update.mutate(
      { id: data.id, isActive },
      {
        onSuccess: () =>
          toast.success(
            isActive
              ? `${data.fullName} activated`
              : `${data.fullName} deactivated. They are signed out of the admin on their next action.`,
          ),
        onError: fail,
        onSettled: () => setConfirmOff(false),
      },
    );
  }

  return (
    <Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="gap-3 border-b border-border-subtle bg-accent/40 p-5 pr-12">
          <div className="flex items-center gap-3">
            <PersonAvatar name={data?.fullName ?? ""} size="lg" />
            <div className="flex min-w-0 flex-col">
              <SheetTitle className="truncate text-lg">
                {data?.fullName ?? "User"}
              </SheetTitle>
              <SheetDescription className="truncate">
                {data?.email ?? "Loading…"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        {user.isError ? (
          <PanelMessage onRetry={() => void user.refetch()}>
            This user could not be loaded.
          </PanelMessage>
        ) : !data ? (
          <div className="flex flex-col gap-4 p-5" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-5">
            <section className="flex flex-col gap-3">
              <h3 className="font-semibold">Account</h3>
              <TextField
                label="Full name"
                value={name}
                disabled={!canUpdate}
                onChange={(e) => setName(e.target.value)}
              />
              {canUpdate && (
                <Button
                  className="self-start"
                  variant="outline"
                  disabled={!nameDirty || !name.trim() || update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: data.id, fullName: name.trim() },
                      {
                        onSuccess: () => toast.success("Name saved"),
                        onError: fail,
                      },
                    )
                  }
                >
                  Save name
                </Button>
              )}
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Active</span>
                  <span className="text-xs text-text-secondary">
                    {data.isActive
                      ? "Can sign in and use the portals."
                      : "Blocked from signing in."}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={data.isActive ? "active" : "inactive"}>
                    {data.isActive ? "Active" : "Inactive"}
                  </StatusBadge>
                  <Switch
                    aria-label="Active"
                    checked={data.isActive}
                    disabled={!canUpdate || update.isPending}
                    onCheckedChange={(on) =>
                      on ? setActive(true) : setConfirmOff(true)
                    }
                  />
                </span>
              </div>
            </section>
            {canUpdate && data.id !== me?.id && (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Password</span>
                  <span className="text-xs text-text-secondary">
                    Emails them a new one and signs them out. They choose their
                    own at next sign-in.
                  </span>
                </span>
                <Button variant="outline" onClick={() => setConfirmReset(true)}>
                  Reset password
                </Button>
              </div>
            )}
            <section className="flex flex-col gap-3">
              <h3 className="font-semibold">Roles</h3>
              <p className="text-xs text-text-secondary">
                What this person can do is the combined permissions of all their
                roles.
              </p>
              {!canSeeRoles ? (
                <p className="text-sm text-text-secondary">
                  You need the role.read permission to see the roles.
                </p>
              ) : roles.isPending ? (
                <Skeleton className="h-32 w-full" />
              ) : roles.isError ? (
                <PanelMessage onRetry={() => void roles.refetch()}>
                  Roles could not be loaded.
                </PanelMessage>
              ) : (
                <ul className="flex flex-col divide-y divide-border-subtle rounded-md border">
                  {roles.data.map((role) => {
                    const off = !role.isActive && !picked.has(role.id);
                    return (
                      <li key={role.id}>
                        <label className="flex items-start gap-3 p-3 transition-colors duration-150 hover:bg-sunken">
                          <Checkbox
                            className="mt-0.5"
                            checked={picked.has(role.id)}
                            disabled={!canAssign || off}
                            onCheckedChange={(on) =>
                              setPicked((prev) => {
                                const next = new Set(prev);
                                if (on === true) next.add(role.id);
                                else next.delete(role.id);
                                return next;
                              })
                            }
                          />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              {roleLabel(role.name)}
                              {role.isSystem && (
                                <Badge variant="secondary">
                                  <Lock aria-hidden /> System
                                </Badge>
                              )}
                              {!role.isActive && (
                                <Badge variant="warning">Inactive</Badge>
                              )}
                            </span>
                            {role.description && (
                              <span className="text-xs text-text-secondary">
                                {role.description}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {canAssign && canSeeRoles && (
                <div className="flex gap-2">
                  <Button
                    disabled={!rolesDirty || setRoles.isPending}
                    onClick={() =>
                      setRoles.mutate(
                        {
                          id: data.id,
                          roleIds: [...picked],
                          current: [...held],
                        },
                        {
                          onSuccess: () =>
                            toast.success(
                              "Roles saved. They apply on this person's next action.",
                            ),
                          onError: fail,
                        },
                      )
                    }
                  >
                    {setRoles.isPending ? "Saving…" : "Save roles"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!rolesDirty || setRoles.isPending}
                    onClick={() => setPicked(new Set(held))}
                  >
                    Discard
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
      <ConfirmDialog
        open={confirmReset}
        title={`Reset ${data?.fullName ?? "this user"}'s password?`}
        description="A new password is emailed to them and they are signed out everywhere. You will not see it."
        confirmLabel="Reset and email"
        pending={resetPassword.isPending}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() =>
          data &&
          resetPassword.mutate(data.id, {
            onSuccess: (result) =>
              result.welcomeEmailSent
                ? toast.success(`New password emailed to ${data.fullName}`)
                : toast.warning(
                    "The password was reset but the email could not be sent. Try Reset password again.",
                  ),
            onError: fail,
            onSettled: () => setConfirmReset(false),
          })
        }
      />
      <ConfirmDialog
        open={confirmOff}
        title={`Deactivate ${data?.fullName ?? "this user"}?`}
        description="They are blocked from signing in and from their next action. You can activate them again later."
        confirmLabel="Deactivate"
        destructive
        pending={update.isPending}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => setActive(false)}
      />
    </Sheet>
  );
}
