export type AdminIcon =
  | "dashboard"
  | "users"
  | "student"
  | "faculty"
  | "folder"
  | "money"
  | "calendar"
  | "star"
  | "file"
  | "wallet"
  | "settings"
  | "shield"
  | "history";
// The optional fourth entry is the permission that shows the item; items without one are always shown.
// The sidebar only hides: the API enforces permissions whatever the UI shows.
export type AdminNavigationGroup = {
  label: string;
  items: [
    title: string,
    suffix: string,
    icon: AdminIcon,
    permission?: string,
  ][];
};
// Suffixes are appended to the admin base path (/admin).
export const adminNavigation: AdminNavigationGroup[] = [
  { label: "Overview", items: [["Dashboard", "/dashboard", "dashboard"]] },
  {
    label: "People",
    items: [
      ["Users", "/users", "users", "user.read"],
      ["Students", "/students", "student", "student.read"],
      ["Faculty", "/faculty", "faculty", "faculty.read"],
    ],
  },
  {
    label: "Catalogue",
    items: [
      ["Categories & Content", "/categories", "folder", "catalogue.read"],
      ["Pricing", "/pricing", "money", "pricing.read"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["Bookings", "/bookings", "calendar"],
      ["Reviews", "/reviews", "star"],
      ["Progress Reports", "/progress", "file"],
    ],
  },
  {
    label: "Finance",
    items: [
      ["Reports", "/reports", "file"],
      ["Payouts", "/payouts", "wallet"],
    ],
  },
  {
    label: "Access",
    items: [
      ["Roles", "/roles", "shield", "role.read"],
      ["Activity log", "/activity", "history", "audit.read"],
    ],
  },
  {
    label: "Account",
    items: [
      ["Settings", "/settings", "settings", "configuration.read"],
      ["Legal documents", "/legal", "file", "policy.read"],
    ],
  },
];

/** The groups and items a signed-in admin may see: an item with a permission needs it, an empty group is dropped. */
export function visibleNavigation(
  has: (permission: string) => boolean,
): AdminNavigationGroup[] {
  return adminNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter(([, , , need]) => !need || has(need)),
    }))
    .filter((group) => group.items.length > 0);
}

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
export function adminPageTitle(pathname: string, base: string) {
  if (pathname === base) return "Dashboard";
  if (isNavigationActive(pathname, `${base}/audit`)) return "Audit logs";
  if (isNavigationActive(pathname, `${base}/activity`)) return "Activity log";
  return (
    adminNavigation
      .flatMap((group) => group.items)
      .find(([, suffix]) => isNavigationActive(pathname, base + suffix))?.[0] ??
    "Page not found"
  );
}
