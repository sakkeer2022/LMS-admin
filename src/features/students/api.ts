"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useWithReauth } from "@/components/security/reauth-provider";
import { api, apiBlob } from "@/lib/api/client";
import { saveBlob } from "@/lib/exports/download";
import {
  toQuery,
  type AdminStudent,
  type AdminStudentDetail,
  type StudentFilters,
} from "./types";

export const studentKeys = {
  list: (filters: StudentFilters) => ["students", "list", filters] as const,
  detail: (id: string) => ["students", "detail", id] as const,
};

export function useStudents(filters: StudentFilters, enabled: boolean) {
  return useQuery({
    queryKey: studentKeys.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<AdminStudent[]>(`/admin/students${toQuery({ ...filters })}`, {
        signal,
      }),
  });
}

export function useStudent(id: string | null) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ""),
    enabled: id !== null,
    queryFn: ({ signal }) =>
      api<AdminStudentDetail>(`/admin/students/${id}`, { signal }).then(
        (r) => r.data,
      ),
  });
}

/** Downloads a student's signed consent. It needs a fresh password confirmation, which the dialog asks for. */
export function useDownloadConsent() {
  const withReauth = useWithReauth();
  return useCallback(
    async (studentId: string, studentName: string): Promise<void> => {
      const pdf = await withReauth(() =>
        apiBlob(`/admin/students/${studentId}/guardian-consent/file`),
      );
      saveBlob(
        pdf,
        `guardian-consent-${studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      );
    },
    [withReauth],
  );
}
