"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, queryString } from "@/lib/api/client";

// Contract: amentorz-backend docs/openapi.yaml, tag Library (listLibraryModerationQueue,
// countLibrarySubmissions, getLibraryModerationRecord, reviewLibraryMaterial, getLibraryContentAdmin).
// One row per submission from a tutor: a new resource or an edit of an approved one.

const base = "/admin/library";

const fileSchema = z.object({ name: z.string(), size: z.number(), mimeType: z.string(), previewable: z.boolean() });
const contentSchema = {
  kind: z.enum(["file", "note"]),
  title: z.string(),
  description: z.string().nullable(),
  body: z.string().nullable(),
  file: fileSchema.nullable(),
};

export const SUBMISSION_STATUSES = ["pending", "approved", "rejected", "all"] as const;
export type SubmissionFilter = (typeof SUBMISSION_STATUSES)[number];

export const submissionSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  revision: z.number(),
  isEdit: z.boolean(),
  status: z.enum(["pending", "approved", "rejected"]),
  ...contentSchema,
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewNotes: z.string().nullable(),
  faculty: z.object({ id: z.string(), fullName: z.string(), email: z.string() }),
  card: z.object({ curriculumId: z.string(), subject: z.string(), pathLabel: z.string() }),
});
export type Submission = z.infer<typeof submissionSchema>;

export const submissionDetailSchema = submissionSchema.extend({
  live: z.object({ ...contentSchema, revision: z.number() }).nullable(),
  history: z.array(
    z.object({
      revision: z.number(),
      status: z.enum(["pending", "approved", "rejected", "superseded", "withdrawn"]),
      submittedAt: z.string(),
      reviewedAt: z.string().nullable(),
      reviewNotes: z.string().nullable(),
    }),
  ),
});
export type SubmissionDetail = z.infer<typeof submissionDetailSchema>;

export const countsSchema = z.object({ pending: z.number(), approved: z.number(), rejected: z.number() });
export type SubmissionCounts = z.infer<typeof countsSchema>;

export interface SubmissionFilters {
  status: SubmissionFilter;
  q?: string;
  page: number;
  limit: number;
}

export const libraryKeys = {
  all: () => ["library"] as const,
  list: (filters: SubmissionFilters) => ["library", "list", filters] as const,
  counts: (q?: string) => ["library", "counts", q ?? ""] as const,
  detail: (id: string) => ["library", "detail", id] as const,
};

export function useSubmissions(filters: SubmissionFilters, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const query = queryString({ status: filters.status, q: filters.q, page: String(filters.page), limit: String(filters.limit) });
      const body = await api<unknown>(`${base}?${query}`, { signal });
      return { rows: z.array(submissionSchema).parse(body.data), total: body.meta?.total ?? 0 };
    },
  });
}

export function useSubmissionCounts(q: string | undefined, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.counts(q),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const query = queryString({ q });
      return countsSchema.parse((await api<unknown>(`${base}/counts${query ? `?${query}` : ""}`, { signal })).data);
    },
  });
}

export function useSubmission(id: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async ({ signal }) =>
      submissionDetailSchema.parse((await api<unknown>(`${base}/${encodeURIComponent(id!)}`, { signal })).data),
  });
}

/** Approve, or reject with a reason (shown to the tutor in their library). */
export function useReviewSubmission() {
  const client = useQueryClient();
  return useMutation({
    meta: { inlineErrors: true },
    mutationFn: async ({ id, ...body }: { id: string; status: "approved" | "rejected"; reason?: string }) =>
      submissionDetailSchema.parse(
        (await api<unknown>(`${base}/${encodeURIComponent(id)}/review`, { method: "PUT", body: JSON.stringify(body) })).data,
      ),
    onSuccess: (detail) => {
      client.setQueryData(libraryKeys.detail(detail.id), detail);
      void client.invalidateQueries({ queryKey: ["library", "list"] });
      void client.invalidateQueries({ queryKey: ["library", "counts"] });
    },
  });
}

const PREVIEW_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

/**
 * The submitted (or live) file as a blob URL, for a sandboxed preview or a download, as the faculty
 * drawer does for verification documents. The caller revokes the URL.
 */
export async function fetchSubmissionFile(id: string, version: "submitted" | "live" = "submitted") {
  const url = `/api/v1${base}/${encodeURIComponent(id)}/content?version=${version}`;
  const get = () => fetch(url, { credentials: "same-origin", cache: "no-store", headers: { "x-portal": "admin" } });
  let response = await get();
  if (response.status === 401) {
    await api<unknown>("/auth/me");
    response = await get();
  }
  if (!response.ok) throw new Error(response.status === 404 ? "The file no longer exists." : "The file could not be opened.");
  const blob = await response.blob();
  const type = PREVIEW_TYPES.has(blob.type) ? blob.type : "application/octet-stream";
  return URL.createObjectURL(new Blob([blob], { type }));
}
