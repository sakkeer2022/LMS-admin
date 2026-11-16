"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import {
  RowActionsMenu,
  type RowAction,
} from "@/features/faculty/components/faculty-table";
import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/lib/utils";
import { roleLabel, type RoleSummary } from "./types";

/** One role as a card: name and tags on top, the description, then people and permission counts. */
export function RoleCard({
  role,
  total,
  mine,
  index,
  actions,
}: {
  role: RoleSummary;
  /** How many permissions exist for admin roles */
  total: number;
  mine: boolean;
  index: number;
  actions: RowAction[];
}) {
  const everything = role.isSystem && role.name === "super_admin";
  return (
    <article
      style={{ "--i": index } as React.CSSProperties}
      className={cn(
        "anim-rise group relative flex w-full flex-col overflow-hidden rounded-md border bg-card shadow-card transition-shadow duration-200 hover:shadow-lg",
        mine && "border-primary",
        !role.isActive && "opacity-70",
      )}
    >
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate text-lg font-semibold">
            <Link
              href={`/admin/roles/${role.id}`}
              className="outline-none after:absolute after:inset-0 focus-visible:underline"
            >
              {roleLabel(role.name)}
            </Link>
          </h2>
          <div
            className="relative z-10 -mt-1 -mr-2 shrink-0"
            onClick={(event) => event.stopPropagation()}
          >
            <RowActionsMenu
              label={`Actions for ${roleLabel(role.name)}`}
              items={actions}
            />
          </div>
        </div>
        {(role.isSystem || mine || !role.isActive) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {mine && <Badge>Your role</Badge>}
            {role.isSystem && (
              <Badge variant="secondary">
                <Lock aria-hidden /> System
              </Badge>
            )}
            {!role.isActive && <Badge variant="warning">Inactive</Badge>}
          </div>
        )}
        <p className="line-clamp-3 text-sm text-text-secondary">
          {role.description || "No description yet."}
        </p>
      </div>
      <dl className="grid grid-cols-2 divide-x border-t bg-sunken/50 text-sm">
        <div className="flex flex-col gap-0.5 px-5 py-3">
          <dt className="text-xs text-text-secondary">People</dt>
          <dd className="font-semibold">{role.userCount}</dd>
        </div>
        <div className="flex flex-col gap-0.5 px-5 py-3">
          <dt className="text-xs text-text-secondary">Permissions</dt>
          <dd className="font-semibold">
            {everything ? "Everything" : `${role.permissionCount} of ${total}`}
          </dd>
        </div>
      </dl>
    </article>
  );
}
