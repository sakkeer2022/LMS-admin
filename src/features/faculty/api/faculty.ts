"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, queryString } from "@/lib/api/client";
import { listQuery, type InviteRequest } from "../schemas/faculty";
import {
  facultyDetailSchema,
  facultyListItemSchema,
  facultyStatusCountsSchema,
  inviteResultSchema,
  type FacultyDetail,
  type FacultyFilters,
  type ReviewInput,
} from "../types/faculty";

const base = "/admin/faculty";

export const facultyKeys = {
  all: () => ["faculty"] as const,
  list: (filters: FacultyFilters) => ["faculty", "list", filters] as const,
  counts: (filters: Pick<FacultyFilters, "categoryId" | "search">) =>
    ["faculty", "counts", filters] as const,
  detail: (id: string) => ["faculty", "detail", id] as const,
};

/** One page of the roster for the selected tab. Keeps the previous page while the next loads. */
export function useFacultyRoster(filters: FacultyFilters, enabled: boolean) {
  return useQuery({
    queryKey: facultyKeys.list(filters),
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
export function useFacultyCounts(filters: Pick<FacultyFilters, "categoryId" | "search">,
  enabled: boolean,
) {
  return useQuery({
    queryKey: facultyKeys.counts(filters),
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
export function useInviteTutors() {
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
    onSettled: () => client.invalidateQueries({ queryKey: facultyKeys.all() }),
  });
}

const at = (id: string) => `${base}/${encodeURIComponent(id)}`;

/** Screen 27b: one tutor's application for the verification drawer. */
export function useFacultyDetail(id: string | undefined) {
  return useQuery({
    queryKey: facultyKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async ({ signal }) => facultyDetailSchema.parse((await api<unknown>(at(id!), { signal })).data),
  });
}

/** Writes that return the updated detail: cache it, then refresh the list, counts and pricing. */
function useDetailMutation<V>(fn: (input: V) => Promise<FacultyDetail>) {
  const client = useQueryClient();
  return useMutation({
    meta: { inlineErrors: true },
    mutationFn: fn,
    onSuccess: (detail) => {
      client.setQueryData(facultyKeys.detail(detail.id), detail);
      void client.invalidateQueries({ queryKey: ["faculty", "list"] });
      void client.invalidateQueries({ queryKey: ["faculty", "counts"] });
      void client.invalidateQueries({ queryKey: ["pricing"] });
    },
  });
}

export function useSetDocumentVerified(facultyId: string) {
  return useDetailMutation(async ({ documentId, isVerified }: { documentId: string; isVerified: boolean }) =>
    facultyDetailSchema.parse(
      (
        await api<unknown>(`${at(facultyId)}/documents/${encodeURIComponent(documentId)}/verification`, {
          method: "PUT",
          body: JSON.stringify({ isVerified }),
        })
      ).data,
    ),
  );
}

/** "Verify & publish" or "Reject" (PUT /admin/faculty/{id}/review). */
export function useReviewFaculty(facultyId: string) {
  return useDetailMutation(async (input: ReviewInput) =>
    facultyDetailSchema.parse(
      (await api<unknown>(`${at(facultyId)}/review`, { method: "PUT", body: JSON.stringify(input) })).data,
    ),
  );
}

const PREVIEW_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

/**
 * Fetches a document through the API (auth cookies, CSRF-free GET) as a blob URL, so it
 * can be previewed in a sandboxed frame or downloaded. The caller revokes the URL.
 */
export async function fetchDocumentBlob(facultyId: string, documentId: string) {
  const url = `/api/v1${at(facultyId)}/documents/${encodeURIComponent(documentId)}/file`;
  const get = () => fetch(url, { credentials: "same-origin", cache: "no-store" });
  let response = await get();
  if (response.status === 401) {
    // An expired access token: api() refreshes the session, then retry once
    await api<unknown>("/auth/me");
    response = await get();
  }
  if (!response.ok) throw new Error(response.status === 404 ? "The file no longer exists." : "The file could not be opened.");
  // Only PDF and images are shown inline; anything else is a download, whatever the server says
  const blob = await response.blob();
  const type = PREVIEW_TYPES.has(blob.type) ? blob.type : "application/octet-stream";
  return URL.createObjectURL(new Blob([blob], { type }));
}
