import { describe, expect, it } from "vitest";
import {
  adminNavigation,
  adminPageTitle,
  isNavigationActive,
} from "../src/components/layout/admin/navigation";
describe("admin navigation", () => {
  it("retains the eleven designed destinations and the two added for consent and legal documents", () => {
    expect(adminNavigation.map((group) => group.label)).toEqual([
      "Overview",
      "People",
      "Catalogue",
      "Operations",
      "Finance",
      "Account",
    ]);
    const items = adminNavigation.flatMap((group) => group.items);
    expect(items).toHaveLength(13);
    expect(new Set(items.map((item) => item[1])).size).toBe(13);
    // Students and Legal documents have no Figma frame yet (amentorz-backend docs/PENDING_DECISIONS.md, P12)
    expect(items.map(([title]) => title)).toEqual(
      expect.arrayContaining(["Students", "Legal documents"]),
    );
    for (const [title, suffix] of items) {
      expect(adminPageTitle(`/admin${suffix}`, "/admin")).toBe(title);
      expect(adminPageTitle(`/admin${suffix}/record-id`, "/admin")).toBe(title);
    }
  });
  it("matches detail paths without matching similarly named siblings", () => {
    expect(isNavigationActive("/admin/users/123", "/admin/users")).toBe(true);
    expect(isNavigationActive("/admin/users-other", "/admin/users")).toBe(
      false,
    );
    expect(adminPageTitle("/admin/unknown", "/admin")).toBe("Page not found");
  });
});
