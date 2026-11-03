"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, queryString } from "@/lib/api/client";
import { listQuery, type InviteRequest } from "../schemas/faculty";
import {
  facultyListItemSchema,
  facultyStatusCountsSchema,
  inviteResultSchema,
  type FacultyFilters,
} from "../types/faculty";

const base = "/admin/faculty";

export const facultyKeys = {
  all: (tenant: string) => ["faculty", tenant] as const,
  list: (tenant: string, filters: FacultyFilters) => ["faculty", tenant, "list", filters] as const,
  counts: (tenant: string, filters: Pick<FacultyFilters, "categoryId" | "search">) =>
    ["faculty", tenant, "counts", filters] as const,
};

/** One page of the roster for the selected tab. Keeps the previous page while the next loads. */
export function useFacultyRoster(tenant: string, filters: FacultyFilters, enabled: boolean) {
  return useQuery({
    queryKey: facultyKeys.list(tenant, filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const response = await api<unknown>(`${base}?${queryString(listQuery(filters))}`, { signal });
      return {
        rows: z.array(facultyListItemSchema).parse(response.data),
        total: response.meta?.total ?? 0,
      };
    },
  });
}

/** Tab badge counts, narrowed by the same category and search as the list. */
export function useFacultyCounts(
  tenant: string,
  filters: Pick<FacultyFilters, "categoryId" | "search">,
  enabled: boolean,
) {
  return useQuery({
    queryKey: facultyKeys.counts(tenant, filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const query = queryString({ categoryId: filters.categoryId, search: filters.search });
      const response = await api<unknown>(`${base}/status-counts${query ? `?${query}` : ""}`, { signal });
      return facultyStatusCountsSchema.parse(response.data);
    },
  });
}

/** POST /admin/faculty/invitations. Errors are shown inside the modal, not as a global toast. */
export function useInviteTutors(tenant: string) {
  const client = useQueryClient();
  return useMutation({
    meta: { inlineErrors: true },
    mutationFn: async (body: InviteRequest) => {
      const response = await api<unknown>(`${base}/invitations`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { ...inviteResultSchema.parse(response.data), message: response.message };
    },
    onSettled: () => client.invalidateQueries({ queryKey: facultyKeys.all(tenant) }),
  });
}
