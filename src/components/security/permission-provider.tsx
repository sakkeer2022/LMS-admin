"use client";
import { createContext, useContext, type ReactNode } from "react";
import { hasPermission } from "@/lib/auth/access";
const Permissions = createContext<string[]>([]);
const Roles = createContext<string[]>([]);
export function PermissionProvider({
  permissions,
  roles = [],
  children,
}: {
  permissions: string[];
  /** Role names (as stored, e.g. super_admin) the signed-in admin holds */
  roles?: string[];
  children: ReactNode;
}) {
  return (
    <Permissions.Provider value={permissions}>
      <Roles.Provider value={roles}>{children}</Roles.Provider>
    </Permissions.Provider>
  );
}
/** The role names the signed-in admin holds, for highlighting "your role". */
export function useMyRoles() {
  return useContext(Roles);
}
/** Every permission the signed-in admin holds, for UI that filters a whole list (the sidebar). */
export function usePermissions() {
  return useContext(Permissions);
}
export function usePermission(permission: string, serverAuthorized = true) {
  return hasPermission(useContext(Permissions), permission) && serverAuthorized;
}
export function Can({
  permission,
  serverAuthorized,
  children,
  fallback = null,
}: {
  permission: string;
  serverAuthorized?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return usePermission(permission, serverAuthorized) ? children : fallback;
}
// For ABAC-controlled resources pass serverAuthorized only after the backend supplies an action capability.
