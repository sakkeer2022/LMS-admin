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
  pricing: z.enum(["none", "awaiting_price", "awaiting_consent", "accepted", "declined"]),
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

export const PRICING_STATUSES = ["none", "awaiting_price", "awaiting_consent", "accepted", "declined"] as const;
export type PricingStatus = (typeof PRICING_STATUSES)[number];

// Contract: getFacultyAdmin (GET /admin/faculty/{facultyId}), screen 27b.
export const facultyDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(["GOVERNMENT_ID", "DEGREE_CERTIFICATE", "PAN_CARD", "EXPERIENCE_LETTER", "BACKGROUND_CHECK", "OTHER"]),
  label: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  uploadedAt: z.string(),
  isVerified: z.boolean(),
  verifiedAt: z.string().nullable(),
  scanStatus: z.enum(["pending", "clean", "infected", "failed"]),
  previewable: z.boolean(),
});
export type FacultyDocument = z.infer<typeof facultyDocumentSchema>;

export const facultyDetailSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  mobileNumber: z.string().nullable(),
  city: z.string().nullable(),
  applicationReference: z.string().nullable(),
  appliedAt: z.string(),
  submittedAt: z.string().nullable(),
  status: z.enum(FACULTY_ROW_STATUSES),
  approvalStatus: z.enum(["pending", "approved", "rejected", "changes_requested"]),
  isPublished: z.boolean(),
  isActive: z.boolean(),
  revision: z.number(),
  rejectionReason: z.string().nullable(),
  approvedAt: z.string().nullable(),
  screening: z.object({
    highestQualification: z.string().nullable(),
    studiedAt: z.string().nullable(),
    teachingExperience: z.object({ code: z.string(), label: z.string() }).nullable(),
    offersOfflineClasses: z.boolean(),
  }),
  documents: z.array(facultyDocumentSchema),
  subjects: z.array(
    z.object({
      assignmentId: z.string(),
      curriculumId: z.string(),
      subject: z.string(),
      pathLabel: z.string(),
      sessionPricePaise: z.number().nullable(),
      studentPaysPaise: z.number().nullable(),
    }),
  ),
  pricing: z.enum(PRICING_STATUSES),
  consentDecidedAt: z.string().nullable(),
});
export type FacultyDetail = z.infer<typeof facultyDetailSchema>;

export interface ReviewInput {
  decision: "approve" | "reject";
  reason?: string;
  publish: boolean;
  expectedRevision: number;
}
