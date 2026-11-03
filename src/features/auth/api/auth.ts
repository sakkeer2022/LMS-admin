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

export interface SecurityEvent { id: string; action: string; createdAt: string; ipAddress?: string; userAgent?: string }
export function useActivity() { return useQuery({ queryKey: [...authKeys.all, 'activity'], queryFn: ({ signal }) => api<SecurityEvent[]>('/admin/me/activity?limit=10', { signal }), retry: false }); }
export interface ProfileUpdate { fullName: string; mobileNumber: string | null; timezone: string | null }
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdate) => api<UserProfile>('/admin/me/profile', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (response) => { client.setQueryData(authKeys.me(), response); client.invalidateQueries({ queryKey: [...authKeys.all, 'activity'] }); },
  });
}
export interface PasswordChangeInput { currentPassword: string; newPassword: string }
// The backend ends every session on success, including this one
export function useChangePassword() { return useMutation({ mutationFn: (input: PasswordChangeInput) => api<null>('/auth/password', { method: 'PUT', body: JSON.stringify(input) }) }); }
