"use client";
import { Typography } from "@/components/ui/Typography";
import { usePathname } from "next/navigation";
import { adminPageTitle } from "./navigation";
export function AdminHeader({ base }: { base: string }) {
  return (
    <Typography variant="h1" className="admin-header-title">
      {adminPageTitle(usePathname(), base)}
    </Typography>
  );
}
