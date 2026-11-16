import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TooltipProvider } from "../src/components/shadcn/tooltip";
import { RoleCard } from "../src/features/roles/role-card";
import {
  areaFor,
  changesThings,
  forAdminRoles,
  isView,
  wordsFor,
} from "../src/features/roles/permission-copy";
import type { PermissionItem, RoleSummary } from "../src/features/roles/types";

const perm = (
  name: string,
  description: string | null = null,
): PermissionItem => {
  const [resource, action] = name.split(".") as [string, string];
  return { id: name, name, resource, action, description };
};
const role = (over: Partial<RoleSummary>): RoleSummary => ({
  id: "r1",
  name: "support",
  description: "Answers questions",
  isSystem: false,
  isActive: true,
  parentId: null,
  permissionCount: 3,
  userCount: 2,
  createdAt: "2026-11-01T00:00:00Z",
  ...over,
});
const card = (r: RoleSummary, mine = false) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <RoleCard role={r} total={40} mine={mine} index={0} actions={[]} />
    </TooltipProvider>,
  );

describe("permission copy", () => {
  it("speaks plainly for known permissions", () => {
    expect(wordsFor(perm("faculty.approve")).label).toBe(
      "Approve tutor applications",
    );
    expect(areaFor("faculty").title).toBe("Tutors");
  });
  it("falls back to the registered description for a permission or area it has never heard of", () => {
    expect(
      wordsFor(perm("payout.approve", "Approve a tutor payout")).label,
    ).toBe("Approve a tutor payout");
    expect(areaFor("payout").title).toBe("Payout");
  });
  it("keeps a tutor's own-profile permissions out of admin roles", () => {
    expect(forAdminRoles(perm("faculty.read_self"))).toBe(false);
    expect(forAdminRoles(perm("faculty.read"))).toBe(true);
  });
  it("tells reading from changing, and marks private data", () => {
    expect(isView(perm("user.read"))).toBe(true);
    expect(changesThings(perm("user.delete"))).toBe(true);
    expect(changesThings(perm("faculty.documents"))).toBe(false);
    expect(wordsFor(perm("faculty.documents")).risk).toBe("sensitive");
  });
});

describe("role cards", () => {
  it("tags the card of a role the signed-in admin holds", () => {
    expect(card(role({}), true)).toContain("Your role");
    expect(card(role({}), false)).not.toContain("Your role");
  });
  it("shows the number of people and the share of permissions", () => {
    const html = card(role({}));
    expect(html).toContain("People");
    expect(html).toContain("3 of 40");
  });
  it("shows Super Admin as holding everything", () => {
    const html = card(
      role({ name: "super_admin", isSystem: true, permissionCount: 1 }),
    );
    expect(html).toContain("Everything");
  });
  it("marks an inactive role", () => {
    expect(card(role({ isActive: false }))).toContain("Inactive");
  });
});

describe("activity views", () => {
  it("asks for raw API requests only when chosen", async () => {
    const { auditParams, NO_AUDIT_FILTERS } = await import("../src/features/audit/types");
    expect(auditParams(NO_AUDIT_FILTERS).view).toBeUndefined();
    expect(auditParams({ ...NO_AUDIT_FILTERS, view: "requests" }).view).toBe("requests");
  });
});
