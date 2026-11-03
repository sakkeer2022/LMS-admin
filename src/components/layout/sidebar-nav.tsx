"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Folder,
  IndianRupee,
  LogOut,
  Settings,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useLogout, useMe } from "@/features/auth/api/auth";
import { useDashboard } from "@/features/dashboard/adapter";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { adminNavigation, isNavigationActive, type AdminIcon } from "./admin/navigation";
import { initialsOf } from "./initials";

const icons: Record<AdminIcon, typeof Users> = {
  dashboard: BarChart3,
  users: Users,
  faculty: UserRound,
  folder: Folder,
  money: IndianRupee,
  calendar: CalendarDays,
  star: Star,
  file: FileText,
  wallet: Wallet,
  settings: Settings,
};

const base = "/admin";
const COUNTED = new Set(["faculty", "reviews"]);

export function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href={base}
      className="flex items-center gap-2 p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        A
      </span>
      <span className={cn("text-xl font-bold tracking-tight", collapsed && "sr-only")}>
        Amentorz
      </span>
    </Link>
  );
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Queue sizes shown beside Faculty and Reviews, from the dashboard alerts
  const counts = new Map(
    useDashboard("alerts")
      .data?.filter((alert) => COUNTED.has(alert.destination))
      .map((alert) => [alert.destination, alert.count]),
  );
  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
    >
      {adminNavigation.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {collapsed ? (
            <div aria-hidden className="mx-2 mt-3 mb-1 border-t border-border-subtle" />
          ) : (
            <p className="px-2 pt-4 pb-1 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
              {group.label}
            </p>
          )}
          {group.items.map(([title, suffix, icon]) => {
            const href = base + suffix;
            const active = isNavigationActive(pathname, href);
            const Icon = icons[icon];
            const count = counts.get(suffix.slice(1));
            const link = (
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-text-secondary outline-none transition-colors hover:bg-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active && "bg-accent text-accent-foreground hover:bg-accent",
                  collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-3 -left-px h-5 w-[3px] rounded-[2px] bg-primary"
                  />
                )}
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className={cn("flex-1 truncate", collapsed && "sr-only")}>
                  {title}
                </span>
                {count !== undefined && !collapsed && (
                  <Badge variant="secondary" aria-label={`${count} waiting`}>
                    {count}
                  </Badge>
                )}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={suffix}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{title}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={suffix}>{link}</div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function SidebarAccount({ collapsed = false }: { collapsed?: boolean }) {
  const me = useMe().data?.data;
  const logout = useLogout();
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border-subtle p-4",
        collapsed && "flex-col px-2",
      )}
    >
      <Link
        href="/admin/profile"
        aria-label="My profile"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Avatar className="size-8 bg-accent">
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initialsOf(me?.fullName)}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm leading-5 font-semibold">
              {me?.fullName ?? "My profile"}
            </span>
            <span className="text-xs leading-4 text-muted-foreground">
              Super admin
            </span>
          </span>
        )}
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Log out"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOut aria-hidden className="size-5" />
      </Button>
    </div>
  );
}
