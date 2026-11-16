import {
  Bell,
  BookOpen,
  FileText,
  FolderTree,
  GraduationCap,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  ToggleLeft,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PermissionItem } from "./types";

/**
 * Plain-language names for the permission catalogue. The catalogue itself (keys and descriptions) comes
 * from the API; this only dresses it for people. A permission or area with no entry here still shows,
 * using its registered description, so registering a new key needs no change in this file.
 */
export interface Area {
  title: string;
  blurb: string;
  icon: LucideIcon;
}

const AREAS: Record<string, Area> = {
  admin: {
    title: "Dashboard & accounts",
    blurb: "The overview, and unlocking or deactivating accounts",
    icon: LayoutDashboard,
  },
  audit: {
    title: "Activity log",
    blurb: "The record of who did what",
    icon: ScrollText,
  },
  catalogue: {
    title: "Categories & content",
    blurb: "Subjects, levels and what students can learn",
    icon: FolderTree,
  },
  configuration: {
    title: "Platform settings",
    blurb: "Business rules that apply everywhere",
    icon: Settings,
  },
  faculty: {
    title: "Faculty",
    blurb: "Inviting, reviewing and approving faculty",
    icon: GraduationCap,
  },
  feature_flags: {
    title: "Feature switches",
    blurb: "Turning parts of the product on or off",
    icon: ToggleLeft,
  },
  library: {
    title: "Faculty library",
    blurb: "Reviewing material faculty upload",
    icon: BookOpen,
  },
  notifications: {
    title: "Notifications",
    blurb: "Messages the platform sends",
    icon: Bell,
  },
  permission: {
    title: "Permission catalogue",
    blurb: "The list of things a role can be allowed",
    icon: KeyRound,
  },
  policy: {
    title: "Legal documents",
    blurb: "Terms and policies people accept",
    icon: FileText,
  },
  pricing: { title: "Pricing", blurb: "What sessions cost", icon: IndianRupee },
  role: {
    title: "Roles & access",
    blurb: "Creating roles and choosing what they can do",
    icon: ShieldCheck,
  },
  student: {
    title: "Students",
    blurb: "Student accounts and guardian consent",
    icon: Users,
  },
  uploads: {
    title: "File uploads",
    blurb: "Adding files to the platform",
    icon: Upload,
  },
  user: {
    title: "Users",
    blurb: "People with an account, and their roles",
    icon: UserRound,
  },
};

interface Words {
  label: string;
  summary: string;
  /** "sensitive" opens private data; any other action that is not a read is a change */
  risk?: "sensitive";
}

const WORDS: Record<string, Words> = {
  "admin.read": {
    label: "See the dashboard",
    summary: "View platform statistics and system health",
  },
  "admin.write": {
    label: "Unlock and deactivate accounts",
    summary: "Unlock a locked account, or turn an account off and on",
  },
  "audit.read": {
    label: "See the activity log",
    summary: "Read the record of sign-ins and changes",
  },
  "catalogue.read": {
    label: "See categories and content",
    summary: "Browse the subject and category structure",
  },
  "catalogue.manage": {
    label: "Edit categories and content",
    summary: "Add, change, move and publish categories and subjects",
  },
  "configuration.read": {
    label: "See platform settings",
    summary: "View the business settings",
  },
  "configuration.manage": {
    label: "Change platform settings",
    summary: "Edit the business settings that apply everywhere",
  },
  "faculty.read": {
    label: "See faculty",
    summary: "View faculty profiles and invitations",
  },
  "faculty.create": {
    label: "Invite faculty",
    summary: "Send invitations and create faculty accounts",
  },
  "faculty.approve": {
    label: "Approve faculty applications",
    summary: "Verify documents, then approve or reject a faculty member",
  },
  "faculty.documents": {
    label: "Open faculty documents",
    summary: "View the private documents faculty upload to prove who they are",
    risk: "sensitive",
  },
  "feature_flags.read": {
    label: "See feature switches",
    summary: "View which features are on",
  },
  "feature_flags.create": {
    label: "Add feature switches",
    summary: "Create a new feature switch",
  },
  "feature_flags.update": {
    label: "Change feature switches",
    summary: "Turn features on or off",
  },
  "feature_flags.delete": {
    label: "Remove feature switches",
    summary: "Delete a feature switch",
  },
  "library.moderate": {
    label: "Review faculty library material",
    summary: "Approve or reject what faculty add to their library",
  },
  "notifications.read": {
    label: "See notifications",
    summary: "View the notification list",
  },
  "notifications.create": {
    label: "Create notifications",
    summary: "Add a new notification",
  },
  "notifications.update": {
    label: "Edit notifications",
    summary: "Change an existing notification",
  },
  "notifications.delete": {
    label: "Remove notifications",
    summary: "Delete a notification",
  },
  "permission.read": {
    label: "See the permission catalogue",
    summary: "View the list of permissions",
  },
  "permission.create": {
    label: "Add permissions",
    summary: "Add an entry to the permission list",
  },
  "permission.update": {
    label: "Edit permissions",
    summary: "Change an entry in the permission list",
  },
  "permission.delete": {
    label: "Remove permissions",
    summary: "Delete an entry from the permission list",
  },
  "policy.read": {
    label: "See legal documents",
    summary: "View terms and policies",
  },
  "policy.create": {
    label: "Upload legal documents",
    summary: "Add a new version of a policy",
  },
  "policy.update": {
    label: "Choose the current version",
    summary: "Decide which policy version people accept",
  },
  "pricing.read": { label: "See pricing", summary: "View session prices" },
  "pricing.manage": {
    label: "Change pricing",
    summary: "Create and edit session prices",
  },
  "role.read": {
    label: "See roles",
    summary: "View roles and what they can do",
  },
  "role.create": { label: "Create roles", summary: "Make a new role" },
  "role.update": {
    label: "Edit roles",
    summary: "Rename, describe, switch off or reorganise a role",
  },
  "role.delete": {
    label: "Delete roles",
    summary: "Remove a role nobody holds",
  },
  "role.assign_permission": {
    label: "Choose what a role can do",
    summary: "Add or take away permissions on a role",
  },
  "student.read": {
    label: "See students",
    summary: "View students and their guardian consent",
  },
  "uploads.create": {
    label: "Upload files",
    summary: "Add files to the platform",
  },
  "user.read": { label: "See users", summary: "View people with an account" },
  "user.create": { label: "Add users", summary: "Create a new account" },
  "user.update": {
    label: "Edit users",
    summary: "Change a name, or turn an account off and on",
  },
  "user.delete": { label: "Remove users", summary: "Delete an account" },
  "user.assign_role": {
    label: "Give people roles",
    summary: "Add or remove the roles someone holds",
  },
};

const titleCase = (text: string) =>
  text.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export const ALL_AREAS = Object.entries(AREAS).map(([id, area]) => ({
  id,
  ...area,
}));

export const areaFor = (resource: string): Area =>
  AREAS[resource] ?? { title: titleCase(resource), blurb: "", icon: KeyRound };

export function wordsFor(p: PermissionItem): Words {
  return (
    WORDS[p.name] ?? {
      label: p.description ?? titleCase(p.action),
      summary: p.description ?? "",
    }
  );
}

/** Portal-only permissions (a faculty member's own profile) are not for admin roles. */
export const forAdminRoles = (p: PermissionItem) => !p.name.endsWith("_self");

/** A read is "view"; anything else changes something. */
export const isView = (p: PermissionItem) => p.action === "read";
export const changesThings = (p: PermissionItem) =>
  !isView(p) && wordsFor(p).risk !== "sensitive";
