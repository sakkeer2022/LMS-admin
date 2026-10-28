'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { usersFilters } from '../schemas/users';
import type { UserSummary } from '../types/user';
export const userKeys = { all: (tenant: string) => ['users', tenant] as const, list: (tenant: string, filters: { page: number; limit: number; search?: string }) => ['users', tenant, 'list', filters] as const };
export function useUsers(tenant: string, filters: { page: number; limit: number; search?: string }, enabled: boolean) {
  const query = usersFilters.parse(filters);
  return useQuery({ queryKey: userKeys.list(tenant, query), enabled, queryFn: ({ signal }) => api<UserSummary[]>(`/users?${new URLSearchParams({ page: String(query.page), limit: String(query.limit), search: query.search ?? '' })}`, { signal }) });
}
// Existing users endpoint is platform-global. Only use in the platform admin boundary.
// Adding tenant to a query key prevents cache mixing; it does NOT scope backend rows.
