import { z } from "zod";

// Contract: amentorz-backend src/modules/faculty (faculty.routes.ts, faculty.list.ts,
// faculty.service.ts) and docs/openapi.yaml (listFacultyAdmin, getFacultyStatusCounts,
// inviteFaculty). Responses are parsed so a contract drift fails loudly.

export const FACULTY_ROW_STATUSES = [
  "invited",
  "expired",
  "pending",
  "verified",
  "published",
  "rejected",
  "suspended",
] as const;
export type FacultyRowStatus = (typeof FACULTY_ROW_STATUSES)[number];

/** Tabs on screen 27. "all" is the existing All profiles view and stays first. */
export const FACULTY_TABS = ["all", "pending", "verified", "published", "suspended"] as const;
export type FacultyTab = (typeof FACULTY_TABS)[number];

export const FACULTY_SORTS = ["recent", "oldest", "name"] as const;
export type FacultySort = (typeof FACULTY_SORTS)[number];

export const facultyListItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["profile", "invitation"]),
  fullName: z.string().nullable(),
  email: z.string(),
  status: z.enum(FACULTY_ROW_STATUSES),
  subjects: z.array(z.string()),
  qualification: z.string().nullable(),
  documents: z.object({ uploaded: z.number(), required: z.number() }).nullable(),
  appliedAt: z.string(),
  invitation: z
    .object({
      sentAt: z.string().nullable(),
      expiresAt: z.string(),
      deliveryMethod: z.enum(["email", "link"]),
    })
    .nullable(),
});
export type FacultyListItem = z.infer<typeof facultyListItemSchema>;

export const facultyStatusCountsSchema = z.object({
  all: z.number(),
  pending: z.number(),
  verified: z.number(),
  published: z.number(),
  suspended: z.number(),
});
export type FacultyStatusCounts = z.infer<typeof facultyStatusCountsSchema>;

export const facultyInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(["pending", "revoked"]),
  deliveryMethod: z.enum(["email", "link"]),
  delivered: z.boolean().nullable(),
  sentAt: z.string().nullable(),
  expiresAt: z.string(),
});
export type FacultyInvitation = z.infer<typeof facultyInvitationSchema>;

export const inviteResultSchema = z.object({
  invitations: z.array(facultyInvitationSchema),
  inviteUrl: z.string().nullable(),
});
export type InviteResult = z.infer<typeof inviteResultSchema>;

export interface FacultyFilters {
  tab: FacultyTab;
  categoryId?: string;
  sort: FacultySort;
  search?: string;
  page: number;
}

export type FacultyRowAction = "view" | "edit" | "suspend" | "delete" | "resend" | "revoke";
