import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Can,
  PermissionProvider,
} from "../src/components/security/permission-provider";
import { visibleNavigation } from "../src/components/layout/admin/navigation";
import { hasPermission } from "../src/lib/auth/access";

const titles = (granted: string[]) =>
  visibleNavigation((need) => hasPermission(granted, need)).flatMap((g) =>
    g.items.map(([title]) => title),
  );

describe("permission-aware navigation", () => {
  it("shows the Access group only to someone who can read roles or the audit log", () => {
    expect(titles(["user.read"])).toContain("Users");
    expect(titles(["user.read"])).not.toContain("Roles");
    expect(titles(["role.read"])).toContain("Roles");
    expect(titles(["role.read"])).not.toContain("Activity log");
    expect(titles(["audit.read"])).toContain("Activity log");
  });
  it("hides everything guarded from a role with no permissions, and drops empty groups", () => {
    const groups = visibleNavigation(() => false);
    expect(
      groups.flatMap((g) => g.items.map(([title]) => title)),
    ).not.toContain("Users");
    expect(groups.map((g) => g.label)).not.toContain("Access");
  });
  it("a wildcard holder (Super Admin) sees every item", () => {
    expect(titles(["*"])).toEqual(
      visibleNavigation(() => true).flatMap((g) => g.items.map(([t]) => t)),
    );
  });
  it("Can renders its children only for a held permission", () => {
    const html = (permissions: string[]) =>
      renderToStaticMarkup(
        <PermissionProvider permissions={permissions}>
          <Can permission="role.create" fallback={<i>no</i>}>
            <b>New role</b>
          </Can>
        </PermissionProvider>,
      );
    expect(html(["role.create"])).toContain("New role");
    expect(html(["role.read"])).toContain("no");
    expect(html(["role.manage"])).toContain("New role");
  });
});
