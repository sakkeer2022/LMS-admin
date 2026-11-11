import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PermissionProvider } from "../src/components/security/permission-provider";
import { Sheet } from "../src/components/shadcn/sheet";
import { DataTable } from "../src/components/data-table/data-table";
import { ReviewView } from "../src/features/faculty/components/faculty-review-drawer";
import { VerificationBadge, facultyColumns } from "../src/features/faculty/components/faculty-table";
import { REASON_DIALOG, VERIFICATION_META, documentsLabel, formatDateTime } from "../src/features/faculty/schemas/faculty";
import {
  VERIFICATION_STATUSES,
  facultyDetailSchema,
  facultyListItemSchema,
  type FacultyDetail,
  type FacultyListItem,
} from "../src/features/faculty/types/faculty";
import { profileSchema } from "../src/features/profile/schema";

const row: FacultyListItem = {
  id: "p1",
  kind: "profile",
  fullName: "Anil Verma",
  email: "anil.verma@example.com",
  status: "pending",
  verification: "reupload_requested",
  isActive: true,
  subjects: ["Physics"],
  qualification: "M.Sc. Physics",
  documents: { uploaded: 3, required: 3, additional: 2 },
  pricing: "none",
  appliedAt: "2026-11-04T09:00:00Z",
  invitation: null,
};

const doc = (id: string, type: FacultyDetail["documents"][number]["type"], label: string, required: boolean) => ({
  id,
  type,
  label,
  fileName: `${id}.pdf`,
  mimeType: "application/pdf",
  fileSize: 2048,
  uploadedAt: "2026-11-04T09:00:00Z",
  isVerified: false,
  verifiedAt: null,
  scanStatus: "pending" as const,
  previewable: true,
  required,
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
  verification: "new",
  approvalStatus: "pending",
  isPublished: false,
  isActive: true,
  revision: 2,
  rejectionReason: null,
  approvedAt: null,
  screening: {
    highestQualification: "M.Sc. Physics",
    studiedAt: null,
    teachingExperience: null,
    offersOfflineClasses: true,
    teachingMode: { code: "hybrid", label: "Hybrid (Both Online & Offline)" },
  },
  reupload: null,
  documents: [
    doc("id", "GOVERNMENT_ID", "Photo ID", true),
    doc("degree", "DEGREE_CERTIFICATE", "Highest degree certificate", true),
    doc("pan", "PAN_CARD", "PAN card", true),
    doc("award", "OTHER", "Additional document", false),
  ],
  subjects: [],
  pricing: "none",
  consentDecidedAt: null,
  consentSigned: false,
};

function wrap(children: ReactNode, permissions = ["faculty.read", "faculty.approve", "faculty.documents"]) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <PermissionProvider permissions={permissions}>
        <Sheet open>{children}</Sheet>
      </PermissionProvider>
    </QueryClientProvider>,
  );
}

describe("verification statuses (Task 1)", () => {
  it("labels New, Approved, Rejected and Requested for re-upload", () => {
    expect(VERIFICATION_STATUSES.map((s) => VERIFICATION_META[s].label)).toEqual(["New", "Approved", "Rejected", "Requested for re-upload"]);
    expect(renderToStaticMarkup(<VerificationBadge status="reupload_requested" />)).toContain("Requested for re-upload");
    expect(renderToStaticMarkup(<VerificationBadge status={null} />)).toContain("—");
  });

  it("shows the verification of each tutor in the roster", () => {
    const html = renderToStaticMarkup(<DataTable caption="Faculty" columns={facultyColumns(vi.fn())} data={[row]} />);
    expect(html).toContain("Requested for re-upload");
    expect(html).toContain("3 of 3 · +2 additional");
  });

  it("parses the new list and detail fields, rejecting unknown values", () => {
    expect(facultyListItemSchema.parse(row)).toEqual(row);
    expect(facultyListItemSchema.safeParse({ ...row, verification: "on_hold" }).success).toBe(false);
    expect(facultyDetailSchema.parse(detail)).toEqual(detail);
  });
});

describe("review drawer decisions (Task 1)", () => {
  it("offers Reject, Request re-upload and Verify & publish for a new application", () => {
    const html = wrap(<ReviewView detail={detail} onClose={vi.fn()} />);
    for (const text of ["Reject", "Request re-upload", "Verify &amp; publish", "New", "Hybrid (Both Online &amp; Offline)"]) expect(html).toContain(text);
  });

  it("shows the open re-upload request with its reason and link expiry", () => {
    const html = wrap(
      <ReviewView
        detail={{
          ...detail,
          verification: "reupload_requested",
          approvalStatus: "changes_requested",
          reupload: { reason: "PAN card is blurred", requestedAt: "2026-11-11T09:00:00Z", expiresAt: "2026-11-14T09:00:00Z", expired: false },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain("Re-upload requested");
    expect(html).toContain("PAN card is blurred");
    expect(html).toContain("link expires 14 Nov 2026");
    expect(html).toContain("Requested for re-upload");
  });

  it("explains each reason dialog", () => {
    expect(REASON_DIALOG.request_reupload.title("Anil")).toBe("Request a re-upload from Anil?");
    expect(REASON_DIALOG.request_reupload.description).toContain("expires");
    expect(REASON_DIALOG.reject.description).toContain("final");
    expect(formatDateTime("2026-11-14T09:00:00Z")).toMatch(/^14 Nov 2026, /);
  });
});

describe("additional documents (Task 2)", () => {
  it("lists additional documents apart, with preview and download", () => {
    const html = wrap(<ReviewView detail={detail} onClose={vi.fn()} />);
    expect(html).toContain("Additional documents (1)");
    expect(html).toContain('aria-label="Download Additional document"');
    expect(html).toContain('aria-label="Preview Additional document"');
    expect(documentsLabel({ ...row, documents: { uploaded: 3, required: 3, additional: 0 } })).toBe("3 of 3");
  });
});

describe("signed price agreement (Task 3)", () => {
  it("offers the signature once the tutor has signed", () => {
    const signed = wrap(<ReviewView detail={{ ...detail, consentSigned: true, consentDecidedAt: "2026-11-12T09:00:00Z" }} onClose={vi.fn()} />);
    expect(signed).toContain("Signed price agreement");
    expect(signed).toContain("View signature");
    expect(wrap(<ReviewView detail={detail} onClose={vi.fn()} />)).not.toContain("Signed price agreement");
  });
});

describe("profile phone number (Task 4)", () => {
  it("accepts the phone field's '+91 9876543210' and sends E.164", () => {
    const parsed = profileSchema.parse({ fullName: "Admin", mobileNumber: "+91 9876543210", timezone: "" });
    expect(parsed.mobileNumber).toBe("+919876543210");
    expect(profileSchema.parse({ fullName: "Admin", mobileNumber: "", timezone: "" }).mobileNumber).toBeNull();
    expect(profileSchema.safeParse({ fullName: "Admin", mobileNumber: "9876543210", timezone: "" }).success).toBe(false);
  });
});

