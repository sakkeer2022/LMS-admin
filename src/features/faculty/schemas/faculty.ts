import { z } from "zod";
import {
  FACULTY_SORTS,
  FACULTY_TABS,
  type FacultyFilters,
  type FacultyListItem,
  type FacultyRowStatus,
  type FacultySort,
  type FacultyTab,
} from "../types/faculty";

// ── Email rule (same expression as the backend, faculty.dto.ts) ──────

export const MAX_EMAIL_LENGTH = 254;
export const MAX_INVITES_PER_REQUEST = 20;

/**
 * RFC 5322 addr-spec in its dot-atom form, with an alphabetic TLD. Quoted local
 * parts, comments and IP-literal domains are rejected, as on the server.
 */
export const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false;
  const at = value.lastIndexOf("@");
  if (at < 1 || at > 64) return false;
  return EMAIL_PATTERN.test(value);
}

/** Inline message for one typed address, or undefined when it is valid. */
export function emailIssue(raw: string): string | undefined {
  const email = normalizeEmail(raw);
  if (!email) return "Enter an email address.";
  if (email.length > MAX_EMAIL_LENGTH) return `Email addresses can be at most ${MAX_EMAIL_LENGTH} characters.`;
  if (!isValidEmail(email)) return `"${raw.trim()}" is not a valid email address.`;
  return undefined;
}

/** Splits typed or pasted text into addresses (comma, semicolon, space or new line). */
export function splitEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export interface ChipsUpdate {
  emails: string[];
  /** Text that could not be added, left in the input so it can be corrected. */
  rest: string;
  error?: string;
}

/** Adds typed text to the entered emails: valid, new addresses become chips. */
export function addEmails(current: readonly string[], text: string): ChipsUpdate {
  const emails = [...current];
  const invalid: string[] = [];
  let error: string | undefined;
  for (const part of splitEmails(text)) {
    const issue = emailIssue(part);
    if (issue) {
      invalid.push(part);
      error ??= issue;
      continue;
    }
    const email = normalizeEmail(part);
    if (emails.includes(email)) continue;
    if (emails.length >= MAX_INVITES_PER_REQUEST) {
      invalid.push(part);
      error ??= `You can invite up to ${MAX_INVITES_PER_REQUEST} tutors at once.`;
      continue;
    }
    emails.push(email);
  }
  return { emails, rest: invalid.join(", "), ...(error && { error }) };
}

/** Body for POST /admin/faculty/invitations; mirrors the backend InviteFacultyDto. */
export const inviteRequestSchema = z.strictObject({
  emails: z
    .array(z.string().refine(isValidEmail, "Enter a valid email address."))
    .min(1, "Enter at least one email address.")
    .max(MAX_INVITES_PER_REQUEST, `You can invite up to ${MAX_INVITES_PER_REQUEST} tutors at once.`),
  delivery: z.enum(["email", "link"]),
});
export type InviteRequest = z.infer<typeof inviteRequestSchema>;

// ── Status presentation ─────────────────────────────────────────────

export type BadgeTone = "neutral" | "success" | "danger" | "warning" | "info" | "accent";

export const STATUS_META: Record<FacultyRowStatus, { label: string; tone: BadgeTone }> = {
  invited: { label: "Invited", tone: "info" },
  expired: { label: "Invite expired", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  published: { label: "Published", tone: "accent" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

export const TAB_LABELS: Record<FacultyTab, string> = {
  all: "All profiles",
  pending: "Pending",
  verified: "Verified",
  published: "Published",
  suspended: "Suspended",
};

export const SORT_LABELS: Record<FacultySort, string> = {
  recent: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
};

export const PAGE_SIZE = 7;

// ── URL state ───────────────────────────────────────────────────────

const uuid = z.uuid();

/**
 * Reads the screen's filters from the URL. `filter` keeps the existing parameter
 * name and accepts the dashboard's capitalised values (`?filter=Pending`).
 */
export function filtersFromParams(params: URLSearchParams): FacultyFilters {
  const tab = (params.get("filter") ?? "").toLowerCase();
  const sort = params.get("sort") ?? "";
  const category = params.get("category") ?? "";
  const search = params.get("search")?.trim() ?? "";
  const page = Number(params.get("page"));
  return {
    tab: (FACULTY_TABS as readonly string[]).includes(tab) ? (tab as FacultyTab) : "all",
    sort: (FACULTY_SORTS as readonly string[]).includes(sort) ? (sort as FacultySort) : "recent",
    ...(uuid.safeParse(category).success && { categoryId: category }),
    ...(search && { search: search.slice(0, 100) }),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Query parameters for GET /admin/faculty. */
export function listQuery(filters: FacultyFilters) {
  return {
    status: filters.tab,
    sort: filters.sort,
    categoryId: filters.categoryId,
    search: filters.search,
    page: String(filters.page),
    limit: String(PAGE_SIZE),
  };
}

// ── Row presentation ────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "28 Aug", or "28 Aug 2025" outside the current year, in the viewer's time zone.
 * Month names are fixed three-letter forms (Intl gives "Sept" in some locales).
 */
export function formatShortDate(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

export function subjectsLabel(row: FacultyListItem) {
  return row.subjects.length ? row.subjects.join(" · ") : "—";
}

export function documentsLabel(row: FacultyListItem) {
  return row.documents ? `${row.documents.uploaded} of ${row.documents.required}` : "—";
}

/** Second line of the tutor cell. */
export function tutorDetail(row: FacultyListItem, now = new Date()) {
  if (row.kind === "profile" || !row.invitation) return row.email;
  if (row.status === "expired") return `Invitation expired ${formatShortDate(row.invitation.expiresAt, now)}`;
  const how = row.invitation.deliveryMethod === "link" ? "Link shared" : "Invitation sent";
  return `${how} · expires ${formatShortDate(row.invitation.expiresAt, now)}`;
}

/** "118 tutor profiles · 7 awaiting verification". */
export function headerSummary(counts: { all: number; pending: number } | undefined) {
  if (!counts) return "Tutor profiles · document screening and category assignment";
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return `${plural(counts.all, "tutor profile")} · ${counts.pending} awaiting verification`;
}

/** Footer text, e.g. "Showing 1–7 of 118 tutors". */
export function rangeLabel(page: number, total: number, limit = PAGE_SIZE) {
  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);
  return `Showing ${first}–${last} of ${total} ${total === 1 ? "tutor" : "tutors"}`;
}
