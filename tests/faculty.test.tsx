import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EMAIL_PATTERN,
  MAX_INVITES_PER_REQUEST,
  STATUS_META,
  addEmails,
  documentsLabel,
  emailIssue,
  filtersFromParams,
  formatShortDate,
  headerSummary,
  inviteRequestSchema,
  isValidEmail,
  listQuery,
  rangeLabel,
  splitEmails,
  subjectsLabel,
  tutorDetail,
} from "../src/features/faculty/schemas/faculty";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { DataTable } from "../src/components/data-table/data-table";
import { PermissionProvider } from "../src/components/security/permission-provider";
import {
  FACULTY_TABLE_HEADERS,
  FacultyStatusBadge,
  PricingBadge,
  facultyColumns,
  rowActions,
} from "../src/features/faculty/components/faculty-table";
import { ReviewView } from "../src/features/faculty/components/faculty-review-drawer";
import { Sheet } from "../src/components/shadcn/sheet";
import { canDecide, formatFileSize, pricingMeta } from "../src/features/faculty/schemas/faculty";
import { FacultyStatusTabs } from "../src/features/faculty/components/faculty-status-tabs";
import { emptyMessage } from "../src/features/faculty/components/faculty-page";
import { flaggedEmails, serverEmailMessages } from "../src/features/faculty/components/invite-tutors-modal";
import { ApiError } from "../src/lib/api/contracts";
import {
  FACULTY_ROW_STATUSES,
  facultyDetailSchema,
  facultyListItemSchema,
  type FacultyDetail,
  inviteResultSchema,
  type FacultyListItem,
} from "../src/features/faculty/types/faculty";

const NOW = new Date("2026-11-03T10:00:00Z");

const profile: FacultyListItem = {
  id: "p1",
  kind: "profile",
  fullName: "Anjali Deshpande",
  email: "anjali.deshpande@gmail.com",
  status: "pending",
  subjects: ["Physics", "Chemistry"],
  qualification: "Ph.D. · IIT Bombay",
  documents: { uploaded: 4, required: 4 },
  pricing: "none",
  appliedAt: "2026-08-28T09:00:00Z",
  invitation: null,
};

const invitation: FacultyListItem = {
  id: "i1",
  kind: "invitation",
  fullName: null,
  email: "ananya.iyer@gmail.com",
  status: "invited",
  subjects: [],
  qualification: null,
  documents: null,
  pricing: "none",
  appliedAt: "2026-11-02T09:00:00Z",
  invitation: { sentAt: "2026-11-02T09:00:01Z", expiresAt: "2026-11-05T09:00:00Z", deliveryMethod: "email" },
};

describe("email rule (same as the backend)", () => {
  it.each(["tutor@example.org", "r.menon+tutor@outlook.com", "o'brien@example.co.in", "a@b.io"])("accepts %s", (e) => {
    expect(isValidEmail(e)).toBe(true);
  });
  it.each([
    "",
    "plain",
    "a@b",
    "a@b.c",
    "a..b@x.com",
    ".a@x.com",
    "a.@x.com",
    "a@-x.com",
    "a@x..com",
    '"q"@x.com',
    "a@[1.2.3.4]",
    "a b@x.com",
    `${"a".repeat(65)}@x.com`,
    `a@${"b".repeat(250)}.com`,
  ])("rejects %j", (e) => {
    expect(isValidEmail(e)).toBe(false);
  });
  it("matches the backend expression", () => {
    expect(EMAIL_PATTERN.source).toBe(
      "^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$",
    );
    expect(EMAIL_PATTERN.flags).toBe("i");
  });
  it("explains empty and invalid input", () => {
    expect(emailIssue("  ")).toBe("Enter an email address.");
    expect(emailIssue(" nope ")).toBe('"nope" is not a valid email address.');
    expect(emailIssue("Tutor@Example.org")).toBeUndefined();
  });
});

describe("email chips", () => {
  it("splits pasted lists on commas, semicolons, spaces and new lines", () => {
    expect(splitEmails("a@x.com, b@x.com;c@x.com\nd@x.com  e@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
      "d@x.com",
      "e@x.com",
    ]);
  });
  it("adds valid addresses lowercased, skips duplicates and keeps invalid text in the input", () => {
    expect(addEmails(["a@x.com"], "A@X.com, B@x.com bad, worse@")).toEqual({
      emails: ["a@x.com", "b@x.com"],
      rest: "bad, worse@",
      error: '"bad" is not a valid email address.',
    });
  });
  it("stops at the per-request maximum", () => {
    const full = Array.from({ length: MAX_INVITES_PER_REQUEST }, (_, i) => `t${i}@x.com`);
    const update = addEmails(full, "extra@x.com");
    expect(update.emails).toHaveLength(MAX_INVITES_PER_REQUEST);
    expect(update.rest).toBe("extra@x.com");
    expect(update.error).toBe(`You can invite up to ${MAX_INVITES_PER_REQUEST} tutors at once.`);
  });
  it("validates the request body like the backend", () => {
    expect(inviteRequestSchema.safeParse({ emails: [], delivery: "email" }).error?.issues[0]?.message).toBe(
      "Enter at least one email address.",
    );
    expect(inviteRequestSchema.safeParse({ emails: ["bad"], delivery: "email" }).success).toBe(false);
    expect(inviteRequestSchema.safeParse({ emails: ["a@x.com"], delivery: "link", extra: 1 }).success).toBe(false);
    expect(inviteRequestSchema.parse({ emails: ["a@x.com"], delivery: "link" })).toEqual({
      emails: ["a@x.com"],
      delivery: "link",
    });
  });
  it("reads per-address server errors and flags their chips", () => {
    const error = new ApiError(409, "2 of these email addresses cannot be invited", {
      emails: ["a@x.com already has an Amentorz account", "b@x.com: the invitation email could not be sent"],
    });
    const messages = serverEmailMessages(error);
    expect(messages).toHaveLength(2);
    expect([...flaggedEmails(messages, ["a@x.com", "b@x.com", "c@x.com", "a@x.co"])]).toEqual(["a@x.com", "b@x.com"]);
    expect(serverEmailMessages(new Error("x"))).toEqual([]);
  });
});

describe("URL filters", () => {
  it("defaults to the All tab, newest first, page 1", () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual({ tab: "all", sort: "recent", page: 1 });
  });
  it("accepts the dashboard's capitalised filter and ignores junk", () => {
    expect(filtersFromParams(new URLSearchParams("filter=Pending&page=3&sort=name"))).toMatchObject({
      tab: "pending",
      page: 3,
      sort: "name",
    });
    expect(filtersFromParams(new URLSearchParams("filter=deleted&page=-2&sort=x&category=1"))).toEqual({
      tab: "all",
      sort: "recent",
      page: 1,
    });
  });
  it("keeps a valid category and search", () => {
    const f = filtersFromParams(new URLSearchParams("category=8c121988-8afa-4fb7-b6eb-9b0dcb94f730&search=%20rao%20"));
    expect(f).toMatchObject({ categoryId: "8c121988-8afa-4fb7-b6eb-9b0dcb94f730", search: "rao" });
  });
  it("builds the list query with a page size of 7", () => {
    expect(listQuery({ tab: "verified", sort: "oldest", page: 2 })).toEqual({
      status: "verified",
      sort: "oldest",
      categoryId: undefined,
      search: undefined,
      page: "2",
      limit: "7",
    });
  });
});

describe("row presentation", () => {
  it("formats the applied date like the design", () => {
    expect(formatShortDate("2026-08-28T09:00:00Z", NOW)).toBe("28 Aug");
    expect(formatShortDate("2025-08-28T09:00:00Z", NOW)).toBe("28 Aug 2025");
    expect(formatShortDate("nonsense", NOW)).toBe("—");
  });
  it("labels subjects, documents and the tutor detail", () => {
    expect(subjectsLabel(profile)).toBe("Physics · Chemistry");
    expect(documentsLabel(profile)).toBe("4 of 4");
    expect(subjectsLabel(invitation)).toBe("—");
    expect(documentsLabel(invitation)).toBe("—");
    expect(tutorDetail(profile, NOW)).toBe("anjali.deshpande@gmail.com");
    expect(tutorDetail(invitation, NOW)).toBe("Invitation sent · expires 5 Nov");
    expect(tutorDetail({ ...invitation, invitation: { ...invitation.invitation!, deliveryMethod: "link" } }, NOW)).toBe(
      "Link shared · expires 5 Nov",
    );
    expect(tutorDetail({ ...invitation, status: "expired" }, NOW)).toBe("Invitation expired 5 Nov");
  });
  it("summarises the header and the footer", () => {
    expect(headerSummary({ all: 118, pending: 7 })).toBe("118 tutor profiles · 7 awaiting verification");
    expect(headerSummary({ all: 1, pending: 0 })).toBe("1 tutor profile · 0 awaiting verification");
    expect(rangeLabel(1, 118)).toBe("Showing 1–7 of 118 tutors");
    expect(rangeLabel(17, 118)).toBe("Showing 113–118 of 118 tutors");
    expect(rangeLabel(1, 0)).toBe("Showing 0–0 of 0 tutors");
    expect(rangeLabel(1, 1)).toBe("Showing 1–1 of 1 tutor");
  });
  it("has a label and badge variant for every status, matching the design colours", () => {
    for (const status of FACULTY_ROW_STATUSES) expect(STATUS_META[status].label).toBeTruthy();
    expect(STATUS_META.pending.variant).toBe("warning");
    expect(STATUS_META.verified.variant).toBe("success");
    expect(STATUS_META.published.variant).toBe("default");
    expect(STATUS_META.suspended.variant).toBe("destructive");
  });
  it("labels the pricing state after approval, and nothing before", () => {
    expect(pricingMeta("none")).toBeUndefined();
    expect(pricingMeta("awaiting_price")?.label).toBe("Price pending");
    expect(pricingMeta("declined")?.variant).toBe("destructive");
  });
  it("formats file sizes and knows when a decision is allowed", () => {
    expect(formatFileSize(900)).toBe("900 B");
    expect(formatFileSize(312 * 1024)).toBe("312 KB");
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe("1.3 MB");
    expect(canDecide({ approvalStatus: "pending" })).toBe(true);
    expect(canDecide({ approvalStatus: "changes_requested" })).toBe(true);
    expect(canDecide({ approvalStatus: "approved" })).toBe(false);
    expect(canDecide({ approvalStatus: "rejected" })).toBe(false);
  });
  it("explains empty results", () => {
    expect(emptyMessage({ tab: "all", sort: "recent", page: 1 })).toBe("No tutors yet. Invite a tutor to start onboarding.");
    expect(emptyMessage({ tab: "suspended", sort: "recent", page: 1 })).toBe("No suspended tutors.");
    expect(emptyMessage({ tab: "pending", sort: "recent", page: 1, search: "rao" })).toBe('No tutors match "rao".');
    expect(emptyMessage({ tab: "all", sort: "recent", page: 1, categoryId: "c" })).toBe(
      "No tutors are assigned to this category yet.",
    );
  });
});

describe("row actions", () => {
  it("offers view, edit, suspend and delete for profiles and calls the handler", () => {
    const onAction = vi.fn();
    const items = rowActions(profile, onAction);
    expect(items.map((i) => i.label)).toEqual(["Review application", "Edit", "Suspend", "Delete"]);
    expect(rowActions({ ...profile, status: "verified" }, onAction)[0]!.label).toBe("View profile");
    expect(items.find((i) => i.id === "delete")?.destructive).toBe(true);
    items[2]!.onSelect();
    expect(onAction).toHaveBeenCalledWith("suspend", profile);
  });
  it("disables Suspend for a suspended tutor", () => {
    expect(rowActions({ ...profile, status: "suspended" }, vi.fn()).find((i) => i.id === "suspend")?.disabled).toBe(true);
  });
  it("offers resend and revoke for invitations", () => {
    expect(rowActions(invitation, vi.fn()).map((i) => i.label)).toEqual(["Resend invitation", "Revoke invitation"]);
    const expired = rowActions({ ...invitation, status: "expired" }, vi.fn());
    expect(expired[0]!.label).toBe("Send a new invitation");
    expect(expired[1]!.disabled).toBe(true);
  });
});

const table = (rows: FacultyListItem[]) =>
  renderToStaticMarkup(<DataTable caption="Faculty" columns={facultyColumns(vi.fn(), NOW)} data={rows} />);

describe("rendering", () => {
  it("renders a profile row with every column and an accessible action menu", () => {
    const html = table([profile]);
    for (const text of ["Anjali Deshpande", "anjali.deshpande@gmail.com", "Physics · Chemistry", "Ph.D. · IIT Bombay", "4 of 4", "28 Aug", "Pending"])
      expect(html).toContain(text);
    expect(html).toContain('aria-label="Actions for Anjali Deshpande"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('data-variant="warning"');
  });
  it("renders an invitation row by email", () => {
    const html = table([invitation]);
    expect(html).toContain("ananya.iyer@gmail.com");
    expect(html).toContain("Invitation sent · expires 5 Nov");
    expect(html).toContain("Invited");
  });
  it("shows the pricing badge beside the status once approved", () => {
    const html = table([{ ...profile, status: "verified", pricing: "awaiting_price" }]);
    expect(html).toContain("Price pending");
  });
  it("uses the design's column order", () => {
    expect(FACULTY_TABLE_HEADERS).toEqual(["Tutor", "Subjects", "Qualification", "Documents", "Applied", "Status", ""]);
    const html = table([profile]);
    const headers = [...html.matchAll(/<th[^>]*>(.*?)<\/th>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ""));
    expect(headers).toEqual(["Tutor", "Subjects", "Qualification", "Documents", "Applied", "Status", "Actions"]);
  });
  it.each([
    ["verified", "success", "Verified"],
    ["published", "default", "Published"],
    ["suspended", "destructive", "Suspended"],
  ] as const)("renders the %s badge", (status, variant, label) => {
    const html = renderToStaticMarkup(<FacultyStatusBadge status={status} />);
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(label);
  });
  it("renders no pricing badge before approval", () => {
    expect(renderToStaticMarkup(<PricingBadge status="none" />)).toBe("");
  });
  it("renders All first and every tab with its count as an accessible tablist", () => {
    const html = renderToStaticMarkup(
      <FacultyStatusTabs
        value="pending"
        counts={{ all: 118, pending: 7, verified: 12, published: 96, suspended: 3 }}
        onChange={vi.fn()}
      >
        queue
      </FacultyStatusTabs>,
    );
    expect(html).toContain('role="tablist"');
    const labels = [...html.matchAll(/role="tab"[^>]*>([A-Za-z ]+)</g)].map((m) => m[1]);
    expect(labels).toEqual(["All profiles", "Pending", "Verified", "Published", "Suspended"]);
    expect(html).toMatch(/aria-selected="true"[^>]*>Pending/);
    for (const n of ["118", "7", "12", "96", "3"]) expect(html).toContain(`>${n}</span>`);
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain("queue");
  });
  it("shows a placeholder while counts load", () => {
    const html = renderToStaticMarkup(<FacultyStatusTabs value="all" counts={undefined} onChange={vi.fn()} />);
    expect(html).toContain("Loading count");
  });
});

const detail: FacultyDetail = {
  id: "f1",
  fullName: "Anil Verma",
  email: "anil.verma@example.com",
  mobileNumber: "+919876543210",
  city: "Pune",
  applicationReference: "AMZ-T-1001",
  appliedAt: "2026-11-04T09:00:00Z",
  submittedAt: "2026-11-04T09:00:00Z",
  status: "pending",
  approvalStatus: "pending",
  isPublished: false,
  isActive: true,
  revision: 1,
  rejectionReason: null,
  approvedAt: null,
  screening: {
    highestQualification: "M.Sc. Physics",
    studiedAt: "University of Pune",
    teachingExperience: { code: "3-5", label: "3–5 years" },
    offersOfflineClasses: true,
  },
  documents: [
    { id: "d1", type: "GOVERNMENT_ID", label: "Photo ID", fileName: "id.pdf", mimeType: "application/pdf", fileSize: 2048, uploadedAt: "2026-11-04T09:00:00Z", isVerified: false, verifiedAt: null, scanStatus: "pending", previewable: true },
    { id: "d2", type: "PAN_CARD", label: "PAN card", fileName: "pan.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileSize: 4096, uploadedAt: "2026-11-04T09:00:00Z", isVerified: true, verifiedAt: "2026-11-04T10:00:00Z", scanStatus: "pending", previewable: false },
  ],
  subjects: [
    { assignmentId: "a1", curriculumId: "c1", subject: "Physics", pathLabel: "Academic › School › K-12 › CBSE › Class 11", sessionPricePaise: null, studentPaysPaise: null },
    { assignmentId: "a2", curriculumId: "c2", subject: "Chemistry", pathLabel: "Academic › School › K-12 › CBSE › Class 11", sessionPricePaise: 80000, studentPaysPaise: 94400 },
  ],
  pricing: "none",
  consentDecidedAt: null,
};

function wrap(children: ReactNode, permissions = ["faculty.read", "faculty.approve", "faculty.documents"]) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <PermissionProvider permissions={permissions}>
        {/* The drawer's title and description need the sheet's context */}
        <Sheet open>{children}</Sheet>
      </PermissionProvider>
    </QueryClientProvider>,
  );
}

describe("review drawer (27b)", () => {
  it("parses the detail contract", () => {
    expect(facultyDetailSchema.parse(detail)).toEqual(detail);
    expect(facultyDetailSchema.safeParse({ ...detail, pricing: "maybe" }).success).toBe(false);
  });
  it("shows screening, documents, subject cards and the decision for a pending application", () => {
    const html = wrap(<ReviewView detail={detail} onClose={vi.fn()} />);
    for (const text of ["AMZ-T-1001", "M.Sc. Physics", "University of Pune", "3–5 years", "Pune", "Photo ID", "PAN card", "1 of 2 verified", "Physics", "No price yet", "Publish profile to discovery once verified", "Verify &amp; publish", "Reject", "Mark as verified"])
      expect(html).toContain(text);
    expect(html).toContain("₹800");
    // Word files are download only
    expect(html).toContain('aria-label="Preview Photo ID"');
    expect(html).not.toContain('aria-label="Preview PAN card"');
    expect(html).toContain('aria-label="Download PAN card"');
  });
  it("hides the decision once decided and without faculty.approve", () => {
    const approved = wrap(<ReviewView detail={{ ...detail, approvalStatus: "approved", status: "verified", pricing: "awaiting_price" }} onClose={vi.fn()} />);
    expect(approved).not.toContain("Verify &amp; publish");
    expect(approved).toContain("Price pending");
    const reader = wrap(<ReviewView detail={detail} onClose={vi.fn()} />, ["faculty.read"]);
    expect(reader).not.toContain("Verify &amp; publish");
    expect(reader).not.toContain("Mark as verified");
    expect(reader).not.toContain('aria-label="Download');
  });
  it("shows the rejection reason and the declined prices notice", () => {
    const rejected = wrap(<ReviewView detail={{ ...detail, approvalStatus: "rejected", status: "rejected", rejectionReason: "Blurred ID" }} onClose={vi.fn()} />);
    expect(rejected).toContain("Blurred ID");
    const declined = wrap(<ReviewView detail={{ ...detail, approvalStatus: "approved", status: "verified", pricing: "declined" }} onClose={vi.fn()} />);
    expect(declined).toContain("declined these prices");
  });
});

describe("response contracts", () => {
  it("parses list items and invite results, rejecting drift", () => {
    expect(facultyListItemSchema.parse(profile)).toEqual(profile);
    expect(facultyListItemSchema.safeParse({ ...profile, status: "archived" }).success).toBe(false);
    expect(
      inviteResultSchema.parse({
        invitations: [
          { id: "1", email: "a@x.com", status: "pending", deliveryMethod: "email", delivered: true, sentAt: null, expiresAt: "2026-11-06T00:00:00Z" },
        ],
        inviteUrl: null,
      }).invitations,
    ).toHaveLength(1);
  });
});
