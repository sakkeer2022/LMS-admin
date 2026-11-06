"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWithReauth } from "@/components/security/reauth-provider";
import { api } from "@/lib/api/client";
import type { AdminPolicy, Country, PolicyCoverage } from "./types";

export const legalKeys = {
  policies: ["legal", "policies"] as const,
  coverage: ["legal", "coverage"] as const,
  countries: ["regions", "countries"] as const,
};

export const usePolicies = (enabled: boolean) =>
  useQuery({
    queryKey: legalKeys.policies,
    enabled,
    queryFn: ({ signal }) =>
      api<AdminPolicy[]>("/admin/policies", { signal }).then((r) => r.data),
  });

export const usePolicyCoverage = (enabled: boolean) =>
  useQuery({
    queryKey: legalKeys.coverage,
    enabled,
    queryFn: ({ signal }) =>
      api<PolicyCoverage[]>("/admin/policies/coverage", { signal }).then(
        (r) => r.data,
      ),
  });

export const useCountries = () =>
  useQuery({
    queryKey: legalKeys.countries,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      api<Country[]>("/regions/countries", { signal }).then((r) => r.data),
  });

export interface UploadInput {
  type: string;
  country: string;
  version: string;
  title: string;
  effectiveAt: string;
  file: File;
}

/** Uploads a policy version; asks for the password first if the session's confirmation is not fresh. */
export function useUploadPolicy() {
  const client = useQueryClient();
  const withReauth = useWithReauth();
  return useMutation({
    mutationFn: (input: UploadInput) =>
      withReauth(() => {
        const form = new FormData();
        form.set("type", input.type);
        form.set("country", input.country);
        form.set("version", input.version);
        form.set("title", input.title);
        form.set("effectiveAt", input.effectiveAt);
        form.set("file", input.file, input.file.name);
        return api<AdminPolicy>("/admin/policies", {
          method: "POST",
          body: form,
        });
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["legal"] }),
  });
}

export function useSetPolicyCurrent() {
  const client = useQueryClient();
  const withReauth = useWithReauth();
  return useMutation({
    mutationFn: (policyId: string) =>
      withReauth(() =>
        api<AdminPolicy>(`/admin/policies/${policyId}/current`, {
          method: "PUT",
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["legal"] }),
  });
}
