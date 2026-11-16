"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { usersFilters } from "../schemas/users";
import type { UserDetail, UserSummary } from "../types/user";
export const userKeys = {
  all: ["users"] as const,
  list: (filters: { page: number; limit: number; search?: string; roleId?: string }) =>
    ["users", "list", filters] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};
export function useUsers(
  filters: { page: number; limit: number; search?: string; roleId?: string },
  enabled: boolean,
) {
  const query = usersFilters.parse(filters);
  return useQuery({
    queryKey: userKeys.list(query),
    enabled,
    queryFn: ({ signal }) =>
      api<UserSummary[]>(
        `/users?${new URLSearchParams({ page: String(query.page), limit: String(query.limit), search: query.search ?? "", audience: "admin", ...(query.roleId && { roleId: query.roleId }) })}`,
        { signal },
      ),
  });
}
export function useUser(id: string | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    enabled: id !== null,
    queryFn: ({ signal }) =>
      api<UserDetail>(`/users/${id}`, { signal }).then((r) => r.data),
  });
}
export function useUserMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: userKeys.all });
  return {
    create: useMutation({
      mutationFn: (body: {
        email: string;
        password: string;
        fullName: string;
        roleIds?: string[];
      }) =>
        api<UserDetail & { welcomeEmailSent: boolean }>("/users", {
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
        fullName?: string;
        isActive?: boolean;
      }) =>
        api<UserDetail>(`/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }).then((r) => r.data),
      onSuccess: done,
    }),
    resetPassword: useMutation({
      mutationFn: (id: string) =>
        api<{ welcomeEmailSent: boolean }>(`/users/${id}/reset-password`, {
          method: "POST",
        }).then((r) => r.data),
      onSuccess: done,
    }),
    // The API refuses an empty set on PUT, so removing every role is a DELETE of the roles held
    setRoles: useMutation({
      mutationFn: ({
        id,
        roleIds,
        current,
      }: {
        id: string;
        roleIds: string[];
        current: string[];
      }) =>
        roleIds.length > 0
          ? api<UserDetail>(`/users/${id}/roles`, {
              method: "PUT",
              body: JSON.stringify({ roleIds }),
            })
          : current.length > 0
            ? api<UserDetail>(`/users/${id}/roles`, {
                method: "DELETE",
                body: JSON.stringify({ roleIds: current }),
              })
            : Promise.resolve(null),
      onSuccess: done,
    }),
  };
}
