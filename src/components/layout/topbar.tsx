"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell, PanelLeft, Search } from "lucide-react";
import { useLogout, useMe } from "@/features/auth/api/auth";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Input } from "@/components/shadcn/input";
import { adminNavigation } from "./admin/navigation";
import { initialsOf } from "./initials";

const base = "/admin";
const pages = adminNavigation.flatMap((group) => group.items);

function NavigationSearch() {
  const [query, setQuery] = useState("");
  const matches = query
    ? pages.filter(([label]) => label.toLowerCase().includes(query.toLowerCase()))
    : [];
  return (
    <div className="relative hidden w-full max-w-[437px] sm:block">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label="Search navigation"
        placeholder="Search users, bookings, payouts"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setQuery("")}
        className="h-9 border-transparent bg-sunken pl-10 placeholder:text-muted-foreground"
      />
      {query && (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-md border bg-popover p-1 shadow-card">
          {matches.map(([label, suffix]) => (
            <Link
              key={label}
              href={base + suffix}
              onClick={() => setQuery("")}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {label}
            </Link>
          ))}
          {!matches.length && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No matching pages
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Topbar({ onToggleNavigation }: { onToggleNavigation: () => void }) {
  const me = useMe().data?.data;
  const logout = useLogout();
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 bg-card px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle navigation"
        onClick={onToggleNavigation}
      >
        <PanelLeft aria-hidden className="size-5" />
      </Button>
      <NavigationSearch />
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell aria-hidden className="size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <p className="px-2 pb-2 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="User menu"
              className="rounded-pill outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                  {initialsOf(me?.fullName)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/admin/profile">My profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={logout.isPending}
              onSelect={() => logout.mutate()}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
