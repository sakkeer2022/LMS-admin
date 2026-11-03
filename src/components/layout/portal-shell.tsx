"use client";
import {
  Button,
  Disclosure,
  FormError,
  TextField,
  Typography,
} from "@/components/ui";
import { Link } from "@/components/ui/Link";
import { useMe } from "@/features/auth/api/auth";
import { api } from "@/lib/api/client";
import { adminNavigation, portalBrand, portalTitle } from "@/lib/auth/portal-config";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminHeader } from "./admin/AdminHeader";
import { AdminPageContainer } from "./admin/AdminPageContainer";
import { AdminSidebar } from "./admin/AdminSidebar";
// Up to two letters from the person's name; a neutral mark until it has loaded
function initialsOf(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "•";
  return (words[0]![0]! + (words.length > 1 ? words[words.length - 1]![0]! : "")).toUpperCase();
}
export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
   client = useQueryClient();
  const base = "/admin";
  const initials = initialsOf(useMe().data?.data.fullName);
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [dark, setDark] = useState(false),
    [loggingOut, setLoggingOut] = useState(false),
    [error, setError] = useState("");
  const toggle = useRef<HTMLButtonElement>(null),
    aside = useRef<HTMLElement>(null);
  const groups = adminNavigation;
  useEffect(() => {
    const saved = localStorage.getItem("amentorz-theme") === "dark";
    setDark(saved);
    document.documentElement.dataset.theme = saved ? "dark" : "light";
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const workspace = document.querySelector<HTMLElement>(".workspace");
    workspace?.setAttribute("inert", "");
    const media = window.matchMedia("(max-width: 700px)");
    const resize = () => {
      if (!media.matches) setMobile(false);
    };
    media.addEventListener("change", resize);
    aside.current?.querySelector<HTMLElement>("button,a")?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobile(false);
        toggle.current?.focus();
      }
      if (e.key === "Tab") {
        const items = aside.current?.querySelectorAll<HTMLElement>("button,a");
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      media.removeEventListener("change", resize);
      document.body.style.overflow = overflow;
      workspace?.removeAttribute("inert");
      previous?.focus();
    };
  }, [mobile]);
  async function logout() {
    setLoggingOut(true);
    try {
      await api("/auth/logout", { method: "POST" });
      client.clear();
      window.location.assign("/login");
    } catch {
      setError("Logout failed. Please retry.");
      setLoggingOut(false);
    }
  }
  return (
    <div
      className={`shell ${collapsed ? "is-collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      {mobile && (
        <Button
          variant="overlay"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => {
            setMobile(false);
            toggle.current?.focus();
          }}
        />
      )}
      <aside
        ref={aside}
        className="sidebar"
        id="portal-navigation"
        aria-label="Portal sidebar"
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
      >
        <Link className="brand" href={base}>
          <span className="brand-mark">{portalBrand.mark}</span>
          <strong>{portalBrand.name}</strong>
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => {
            setMobile(false);
            toggle.current?.focus();
          }}
        >
          <X size={18} />
        </Button>
        <AdminSidebar
          base={base}
          onNavigate={() => {
            setMobile(false);
          }}
        />
        <div className="sidebar-account">
          <Link href="/admin/profile" className="account-link">
            <span className="avatar">{initials}</span>
            <span>
              My profile
              <Typography variant="inherit" component="small" tone="muted">
                {portalTitle}
              </Typography>
            </span>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Log out"
            pending={loggingOut}
            pendingLabel=""
            onClick={logout}
          >
            <LogOut size={17} />
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <Button
            ref={toggle}
            size="icon"
            variant="ghost"
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
            aria-controls="portal-navigation"
            aria-expanded={mobile || !collapsed}
            onClick={() => {
              if (window.matchMedia("(max-width: 700px)").matches)
                setMobile(!mobile);
              else setCollapsed(!collapsed);
            }}
          >
            <Menu size={18} />
          </Button>
          <div className="navigation-search">
            {/* <Search size={15} /> */}
            <TextField
              label="Search navigation"
              labelHidden
              variant="search"
              containerClassName="navigation-search-field"
              placeholder="Search users, bookings, payouts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearch("");
              }}
            />
            {search && (
              <div className="search-results">
                {groups
                  .flatMap((g) => g.items)
                  .filter(([label]) =>
                    label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map(([label, suffix]) => (
                    <Link
                      href={base + suffix}
                      key={label}
                      onClick={() => setSearch("")}
                    >
                      {label}
                    </Link>
                  ))}
                {!groups
                  .flatMap((g) => g.items)
                  .some(([label]) =>
                    label.toLowerCase().includes(search.toLowerCase()),
                  ) && <Typography>No matching pages</Typography>}
              </div>
            )}
          </div>
          <div className="header-actions">
            <Button
              size="icon"
              variant="ghost"
              aria-label={dark ? "Use light theme" : "Use dark theme"}
              onClick={() => {
                setDark(!dark);
                document.documentElement.dataset.theme = dark
                  ? "light"
                  : "dark";
                localStorage.setItem("amentorz-theme", dark ? "light" : "dark");
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            <Disclosure
              className="header-menu"
              label="Notifications"
              summary={<Bell size={18} />}
            >
              <div className="popover">
                <strong>Notifications</strong>
                <Typography tone="muted">
                  No notifications yet.
                </Typography>
                <Link href={base}>Open dashboard</Link>
              </div>
            </Disclosure>
            <Disclosure
              className="header-menu"
              label="User menu"
              summary={<span className="avatar">{initials}</span>}
            >
              <div className="popover">
                <Link href="/admin/profile">My profile</Link>
                <Button
                  pending={loggingOut}
                  pendingLabel="Signing out…"
                  onClick={logout}
                >
                  Log out
                </Button>
              </div>
            </Disclosure>
          </div>
        </header>
        <FormError message={error} />
        <AdminPageContainer>{children}</AdminPageContainer>
      </div>
    </div>
  );
}
