export type AdminIcon =
  | "dashboard"
  | "users"
  | "faculty"
  | "folder"
  | "money"
  | "calendar"
  | "star"
  | "file"
  | "wallet"
  | "settings";
export type AdminNavigationGroup = {
  label: string;
  items: [title: string, suffix: string, icon: AdminIcon][];
};
// Tenant scope is supplied by the authorized server layout.
export const adminNavigation: AdminNavigationGroup[] = [
  { label: 'Overview', items: [['Dashboard', '/dashboard', 'dashboard']] },
  { label: 'People', items: [['Users', '/users', 'users'], ['Faculty', '/faculty', 'faculty']] },
  { label: 'Catalogue', items: [['Categories & Content', '/categories', 'folder'], ['Pricing', '/pricing', 'money']] },
  { label: 'Operations', items: [['Bookings', '/bookings', 'calendar'], ['Reviews', '/reviews', 'star'], ['Progress Reports', '/progress', 'file']] },
  { label: 'Finance', items: [['Reports', '/reports', 'file'], ['Payouts', '/payouts', 'wallet']] },
  { label: 'Account', items: [['Settings', '/settings', 'settings']] },
];

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
export function adminPageTitle(pathname: string, base: string) {
  if (pathname === base) return "Dashboard";
  if (isNavigationActive(pathname, `${base}/audit`)) return "Audit logs";
  return (
    adminNavigation
      .flatMap((group) => group.items)
      .find(([, suffix]) => isNavigationActive(pathname, base + suffix))?.[0] ??
    "Page not found"
  );
}
