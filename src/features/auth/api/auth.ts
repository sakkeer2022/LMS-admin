'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { UserProfile } from '../types/auth';
export const authKeys = { all: ['auth'] as const, me: () => ['auth', 'me'] as const, sessions: () => ['auth', 'sessions'] as const };
export function useMe() { return useQuery({ queryKey: authKeys.me(), queryFn: ({ signal }) => api<UserProfile>('/auth/me', { signal }), retry: false }); }
export function useLogin() { const client = useQueryClient(); return useMutation({ mutationFn: (input: { email: string; password: string }) => api<{ user: UserProfile; requiresPasswordChange: boolean }>('/auth/admin/login', { method: 'POST', body: JSON.stringify(input) }), onSuccess: () => client.clear() }); }
export function useLogout() { const client = useQueryClient(); return useMutation({ mutationFn: () => api<null>('/auth/logout', { method: 'POST' }), onSuccess: () => { client.clear(); window.location.assign('/login'); } }); }
