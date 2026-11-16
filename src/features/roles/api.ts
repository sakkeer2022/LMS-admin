"use client";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, queryString } from "@/lib/api/client";
import type { PermissionItem, RoleDetail, RoleSummary } from "./types";

export const roleKeys = {
  all: ["roles"] as const,
  list: (f: { page: number; limit: number; search: string }) =>
    ["roles", "list", f] as const,
  detail: (id: string) => ["roles", "detail", id] as const,
  permissions: ["roles", "permissions"] as const,
};

export function useRoles(
  filters: { page: number; limit: number; search: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: roleKeys.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<RoleSummary[]>(
        `/roles?${queryString({ page: String(filters.page), limit: String(filters.limit), search: filters.search, audience: "admin" })}`,
        { signal },
      ),
  });
}

/** Role options for pickers: the first 100 admin-portal roles by name. */
export function useRoleOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["roles", "options"],
    enabled,
    queryFn: ({ signal }) =>
      api<RoleSummary[]>("/roles?page=1&limit=100&audience=admin", {
        signal,
      }).then((r) => r.data),
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      api<RoleDetail>(`/roles/${id}`, { signal }).then((r) => r.data),
  });
}

/** The permission catalogue, as registered in code. The `*` wildcard is Super Admin's alone and never offered. */
export function usePermissionCatalogue(enabled: boolean) {
  return useQuery({
    queryKey: roleKeys.permissions,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      api<PermissionItem[]>("/permissions?page=1&limit=100", { signal }).then(
        (r) => r.data.filter((p) => p.name !== "*"),
      ),
  });
}

export function useRoleMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: roleKeys.all });
  return {
    create: useMutation({
      mutationFn: (body: { name: string; description?: string }) =>
        api<RoleDetail>("/roles", {
          method: "POST",
          body: JSON.stringify(body),
        }).then((r) => r.data),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        ...body
      }: {
        id: string;
        name?: string;
        description?: string;
        isActive?: boolean;
      }) =>
        api<RoleDetail>(`/roles/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }).then((r) => r.data),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        api<null>(`/roles/${id}`, { method: "DELETE" }),
      onSuccess: done,
    }),
    /** Replaces a role's permissions. The API refuses an empty set on PUT, so clearing is a DELETE of what is held. */
    setPermissions: useMutation({
      mutationFn: ({
        id,
        ids,
        current,
      }: {
        id: string;
        ids: string[];
        current: string[];
      }) =>
        ids.length > 0
          ? api<RoleDetail>(`/roles/${id}/permissions`, {
              method: "PUT",
              body: JSON.stringify({ permissionIds: ids }),
            })
          : current.length > 0
            ? api<RoleDetail>(`/roles/${id}/permissions`, {
                method: "DELETE",
                body: JSON.stringify({ permissionIds: current }),
              })
            : Promise.resolve(null),
      onSuccess: done,
    }),
  };
}
