"use client";
import { createContext, useContext, type ReactNode } from "react";
import { hasPermission } from "@/lib/auth/access";
const Permissions = createContext<string[]>([]);
export function PermissionProvider({
  permissions,
  children,
}: {
  permissions: string[];
  children: ReactNode;
}) {
  return (
    <Permissions.Provider value={permissions}>{children}</Permissions.Provider>
  );
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
