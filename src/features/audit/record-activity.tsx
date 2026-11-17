"use client";
import { History } from "lucide-react";
import { usePermission } from "@/components/security/permission-provider";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useActorNames, useAudit } from "./api";
import { NO_AUDIT_FILTERS } from "./types";

const words = (action: string) => {
  const text = (action.split(".").pop() ?? action).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * The latest decisions about one record (for example a faculty member approved or rejected), newest first.
 * Only named actions are listed, never page views or raw requests. Hidden without `audit.read`.
 */
export function RecordActivity({
  entity,
  resourceId,
}: {
  entity: string;
  resourceId: string;
}) {
  const allowed = usePermission("audit.read");
  const canNames = usePermission("user.read");
  const query = useAudit({ ...NO_AUDIT_FILTERS, entity }, 1, 10, allowed, resourceId);
  const rows = (query.data?.data ?? []).filter(
    (e) => !e.action.endsWith("_viewed"),
  );
  const names = useActorNames(
    rows.flatMap((e) => (e.actorId ? [e.actorId] : [])),
    canNames,
  );
  if (!allowed) return null;
  return (
    <section className="flex flex-col gap-3 border-b p-4" aria-label="Activity">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History aria-hidden className="size-4 text-muted-foreground" /> Activity
      </h3>
      {query.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-col text-sm">
              <span className="font-medium">{words(e.action)}</span>
              <span className="text-xs text-muted-foreground">
                {e.actorId
                  ? `by ${names.get(e.actorId) ?? e.actorId.slice(0, 8)}`
                  : "by the system"}{" "}
                ·{" "}
                {new Date(e.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
