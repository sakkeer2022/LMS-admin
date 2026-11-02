'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { UserProfile } from '../types/auth';
export const authKeys = { all: ['auth'] as const, me: () => ['auth', 'me'] as const, sessions: () => ['auth', 'sessions'] as const };
export function useMe() { return useQuery({ queryKey: authKeys.me(), queryFn: ({ signal }) => api<UserProfile>('/auth/me', { signal }), retry: false }); }
export function useLogin() { const client = useQueryClient(); return useMutation({ mutationFn: (input: { email: string; password: string }) => api<{ user: UserProfile; requiresPasswordChange: boolean }>('/auth/admin/login', { method: 'POST', body: JSON.stringify(input) }), onSuccess: () => client.clear() }); }
export function useLogout() { const client = useQueryClient(); return useMutation({ mutationFn: () => api<null>('/auth/logout', { method: 'POST' }), onSuccess: () => { client.clear(); window.location.assign('/login'); } }); }

export interface OwnSession { jti: string; createdAt: string; expiresAt: string; isCurrent: boolean; userAgent?: string }
export function useSessions() { return useQuery({ queryKey: authKeys.sessions(), queryFn: ({ signal }) => api<OwnSession[]>('/auth/sessions?limit=100', { signal }), retry: false }); }
export function useRevokeSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (session: OwnSession) => api<null>(`/auth/sessions/${session.jti}`, { method: 'DELETE' }).then(() => session),
    onSuccess: (session) => {
      if (session.isCurrent) { client.clear(); window.location.assign('/login'); } else client.invalidateQueries({ queryKey: authKeys.sessions() });
    },
  });
}
export function useRevokeOtherSessions() {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => api<null>('/auth/sessions', { method: 'DELETE' }), onSuccess: () => client.invalidateQueries({ queryKey: authKeys.sessions() }) });
}
