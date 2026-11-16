export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  parentId: string | null;
  permissionCount: number;
  userCount: number;
  createdAt: string;
}
export interface RoleDetail extends Omit<
  RoleSummary,
  "permissionCount" | "userCount"
> {
  permissions: { id: string; name: string; resource: string; action: string }[];
}
export interface PermissionItem {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

/** Role names are stored as lowercase_with_underscores; people read and type them as words. */
export const roleLabel = (name: string) =>
  name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export const roleSlug = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, "_")
    .replace(/^_+|_+$/g, "");
