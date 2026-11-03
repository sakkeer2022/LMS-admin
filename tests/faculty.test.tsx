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
import {
  FACULTY_TABLE_HEADERS,
  FacultyRow,
  FacultyStatusBadge,
  rowActions,
} from "../src/features/faculty/components/faculty-table";
import { FacultyStatusTabs } from "../src/features/faculty/components/faculty-status-tabs";
import { emptyMessage } from "../src/features/faculty/components/faculty-page";
import { flaggedEmails, serverEmailMessages } from "../src/features/faculty/components/invite-tutors-modal";
import { ApiError } from "../src/lib/api/contracts";
import {
  FACULTY_ROW_STATUSES,
  facultyListItemSchema,
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
  it("has a label and tone for every status, matching the design colours", () => {
    for (const status of FACULTY_ROW_STATUSES) expect(STATUS_META[status].label).toBeTruthy();
    expect(STATUS_META.pending.tone).toBe("warning");
    expect(STATUS_META.verified.tone).toBe("success");
    expect(STATUS_META.published.tone).toBe("accent");
    expect(STATUS_META.suspended.tone).toBe("danger");
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
    expect(items.map((i) => i.label)).toEqual(["View profile", "Edit", "Suspend", "Delete"]);
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

describe("rendering", () => {
  it("renders a profile row with every column and an accessible action menu", () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <FacultyRow row={profile} onAction={vi.fn()} now={NOW} />
        </tbody>
      </table>,
    );
    for (const text of ["Anjali Deshpande", "anjali.deshpande@gmail.com", "Physics · Chemistry", "Ph.D. · IIT Bombay", "4 of 4", "28 Aug", "Pending"])
      expect(html).toContain(text);
    expect(html).toContain('aria-label="Actions for Anjali Deshpande"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("ui-badge--warning");
  });
  it("renders an invitation row by email", () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <FacultyRow row={invitation} onAction={vi.fn()} now={NOW} />
        </tbody>
      </table>,
    );
    expect(html).toContain("ananya.iyer@gmail.com");
    expect(html).toContain("Invitation sent · expires 5 Nov");
    expect(html).toContain("Invited");
  });
  it("uses the design's column order", () => {
    expect(FACULTY_TABLE_HEADERS).toEqual(["Tutor", "Subjects", "Qualification", "Documents", "Applied", "Status", ""]);
  });
  it.each([
    ["verified", "ui-badge--success", "Verified"],
    ["published", "ui-badge--accent", "Published"],
    ["suspended", "ui-badge--danger", "Suspended"],
  ] as const)("renders the %s badge", (status, tone, label) => {
    const html = renderToStaticMarkup(<FacultyStatusBadge status={status} />);
    expect(html).toContain(tone);
    expect(html).toContain(label);
  });
  it("renders All first and every tab with its count as an accessible tablist", () => {
    const html = renderToStaticMarkup(
      <FacultyStatusTabs
        value="pending"
        counts={{ all: 118, pending: 7, verified: 12, published: 96, suspended: 3 }}
        panelId="panel"
        onChange={vi.fn()}
      />,
    );
    expect(html).toContain('role="tablist"');
    const labels = [...html.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["all", "pending", "verified", "published", "suspended"]);
    expect(html).toMatch(/aria-selected="true"[^>]*data-tab="pending"|data-tab="pending"[^>]*aria-selected="true"/);
    for (const n of ["118", "7", "12", "96", "3"]) expect(html).toContain(`>${n}</span>`);
    expect(html).toContain("All profiles");
    expect(html).toContain('aria-controls="panel"');
  });
  it("shows a placeholder while counts load", () => {
    const html = renderToStaticMarkup(<FacultyStatusTabs value="all" counts={undefined} panelId="p" onChange={vi.fn()} />);
    expect(html).toContain("Loading count");
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
