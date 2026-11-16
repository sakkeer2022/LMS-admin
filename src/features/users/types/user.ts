// The users endpoint is platform-wide and needs the user.read permission.
export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roleCount: number;
  roles: { id: string; name: string }[];
}
export interface UserDetail extends Omit<UserSummary, "roleCount" | "roles"> {
  roles: { id: string; name: string }[];
  updatedAt: string;
}
