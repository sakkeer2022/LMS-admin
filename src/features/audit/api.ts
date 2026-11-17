"use client";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { api, queryString } from "@/lib/api/client";
import type { UserDetail } from "@/features/users/types/user";
import { auditParams, type AuditEvent, type AuditFilters } from "./types";

const path = (f: AuditFilters, page: number, limit: number) =>
  `/audit?${queryString({ ...auditParams(f), page: String(page), limit: String(limit) })}`;

export function useAudit(
  filters: AuditFilters,
  page: number,
  limit: number,
  enabled: boolean,
  resourceId?: string,
) {
  return useQuery({
    queryKey: ["audit", filters, page, limit, resourceId],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<AuditEvent[]>(
        path(filters, page, limit) + (resourceId ? `&resourceId=${resourceId}` : ""),
        { signal },
      ),
  });
}

/** Admins and staff (no students or faculty), for the "Who" filter. Needs user.read. */
export function useStaffOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["users", "staff-options"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      api<UserDetail[]>("/users?page=1&limit=100&audience=admin", { signal }).then(
        (r) => r.data,
      ),
  });
}

/** Names for the actors on a page. Needs user.read; without it the caller shows a short id. */
export function useActorNames(ids: string[], enabled: boolean) {
  const results = useQueries({
    queries: [...new Set(ids)].map((id) => ({
      queryKey: ["users", "detail", id],
      enabled,
      staleTime: 5 * 60_000,
      retry: false,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api<UserDetail>(`/users/${id}`, { signal }).then((r) => r.data),
    })),
  });
  return new Map(
    results.flatMap((r) =>
      r.data ? [[r.data.id, r.data.fullName] as const] : [],
    ),
  );
}

export const EXPORT_LIMIT = 1000;
/** Every entry the current filters match, up to EXPORT_LIMIT, fetched page by page for the CSV. */
export async function fetchAuditForExport(
  filters: AuditFilters,
): Promise<{ rows: AuditEvent[]; truncated: boolean }> {
  const rows: AuditEvent[] = [];
  for (let page = 1; rows.length < EXPORT_LIMIT; page++) {
    const res = await api<AuditEvent[]>(path(filters, page, 100));
    rows.push(...res.data);
    if (page >= (res.meta?.totalPages ?? 1)) return { rows, truncated: false };
  }
  return { rows: rows.slice(0, EXPORT_LIMIT), truncated: true };
}
