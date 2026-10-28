"use client";
import { Link } from "@/components/ui/Link";
import {
  CalendarDays,
  FileText,
  Folder,
  IndianRupee,
  LayoutDashboard,
  Settings,
  Star,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { adminNavigation, isNavigationActive } from "./navigation";
import { Typography } from "@/components/ui/Typography";
const icons = {
  dashboard: LayoutDashboard,
  users: Users,
  faculty: UserCheck,
  folder: Folder,
  money: IndianRupee,
  calendar: CalendarDays,
  star: Star,
  file: FileText,
  wallet: Wallet,
  settings: Settings,
};
export function AdminSidebar({
  base,
  onNavigate,
}: {
  base: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="admin navigation">
      {adminNavigation.map((group) => (
        <div className="sidebar-group" key={group.label}>
          <Typography
            variant="caption"
            component="p"
            tone="muted"
            className="group-label"
          >
            {group.label}
          </Typography>
          {group.items.map(([title, suffix, icon]) => {
            const Icon = icons[icon];
            return (
              <Link
                title={title}
                className="nav-item"
                href={base + suffix}
                key={suffix}
                aria-current={
                  isNavigationActive(pathname, base + suffix)
                    ? "page"
                    : undefined
                }
                onClick={onNavigate}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
