'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { usersFilters } from '../schemas/users';
import type { UserSummary } from '../types/user';
export const userKeys = { all: ['users'] as const, list: (filters: { page: number; limit: number; search?: string }) => ['users', 'list', filters] as const };
export function useUsers(filters: { page: number; limit: number; search?: string }, enabled: boolean) {
  const query = usersFilters.parse(filters);
  return useQuery({ queryKey: userKeys.list(query), enabled, queryFn: ({ signal }) => api<UserSummary[]>(`/users?${new URLSearchParams({ page: String(query.page), limit: String(query.limit), search: query.search ?? '' })}`, { signal }) });
}
// The users endpoint is platform-wide and needs the user.read permission.
