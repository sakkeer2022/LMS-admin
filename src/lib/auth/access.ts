import { z } from 'zod';

// The user returned by GET /auth/me (the backend contract `User`). The backend presents the
// super_admin role as `admin`, so the admin portal checks one role name.
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  fullName: z.string(),
  mobileNumber: z.string().nullable(),
  timezone: z.string().nullish(),
  lastLoginAt: z.string().nullish(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  roles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    permissions: z.array(z.object({ name: z.string() })),
  })),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const ADMIN_ROLE = 'admin';
export const ADMIN_HOME = '/admin/dashboard';

export function isAdmin(user: SessionUser) {
  return user.isActive && user.roles.some(role => role.name === ADMIN_ROLE);
}
export function permissionsOf(user: SessionUser) {
  return [...new Set(user.roles.flatMap(role => role.permissions.map(permission => permission.name)))];
}
export function hasPermission(grants: string[], required: string) {
  return grants.some(grant => {
    if (grant === '*' || grant === 'admin.*' || grant === required) return true;
    const [resource] = required.split(/[.:]/);
    const [subject, action] = grant.split(/[.:]/);
    return resource === subject && (action === '*' || action === 'manage');
  });
}
export function safeRedirect(value: string | null, fallback = ADMIN_HOME) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  return value;
}
