import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../src/components/data-table/data-table";
import { TablePagination } from "../src/components/data-table/table-pagination";
import { initialsOf } from "../src/components/layout/initials";
import { cn } from "../src/lib/utils";
import { loginSchema } from "../src/features/auth/schemas/auth";
import { platformSettingsSchema, settingsDefaults } from "../src/features/settings/schema";

type Row = { name: string; fee: number };
const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "fee", header: "Fee", meta: { align: "right" } },
];

describe("DataTable", () => {
  it("renders headers, rows and an accessible caption", () => {
    const html = renderToStaticMarkup(
      <DataTable caption="Fees" columns={columns} data={[{ name: "Aarav", fee: 1450 }]} />,
    );
    expect(html).toContain("<caption");
    expect(html).toContain("Fees");
    expect(html).toContain("Aarav");
    expect(html).toContain("1450");
    expect(html).toContain("text-right");
  });
  it("shows the empty message only when there are no rows", () => {
    const html = renderToStaticMarkup(
      <DataTable caption="Fees" columns={columns} data={[]} empty="Nothing here" />,
    );
    expect(html).toContain("Nothing here");
    expect(html).toContain('colSpan="2"');
  });
  it("shows placeholders instead of rows while loading", () => {
    const html = renderToStaticMarkup(
      <DataTable caption="Fees" columns={columns} data={[{ name: "Aarav", fee: 1 }]} loading loadingRows={2} />,
    );
    expect(html).not.toContain("Aarav");
    expect(html.match(/<tr/g)).toHaveLength(3);
  });
});

describe("TablePagination", () => {
  it("describes the visible range and disables the unavailable direction", () => {
    const html = renderToStaticMarkup(
      <TablePagination page={1} limit={6} total={214} noun="sessions" onPage={() => {}} />,
    );
    expect(html).toContain("Showing 1–6 of 214 sessions");
    expect(html).toMatch(/disabled="">Previous/);
    expect(html).not.toMatch(/disabled="">Next/);
  });
  it("reports an empty result as 0–0", () => {
    const html = renderToStaticMarkup(
      <TablePagination page={1} limit={6} total={0} noun="users" onPage={() => {}} />,
    );
    expect(html).toContain("Showing 0–0 of 0 users");
  });
});

describe("helpers", () => {
  it("builds initials from the first and last name, with a neutral mark before load", () => {
    expect(initialsOf("Priya Nair")).toBe("PN");
    expect(initialsOf("  priya  kumari  nair ")).toBe("PN");
    expect(initialsOf("Priya")).toBe("P");
    expect(initialsOf(undefined)).toBe("•");
  });
  it("lets the last Tailwind utility win when classes conflict", () => {
    expect(cn("px-2", "px-4", false && "hidden")).toBe("px-4");
  });
  it("accepts any existing password at login and lowercases the email", () => {
    const parsed = loginSchema.parse({ email: "Person@example.com", password: "legacy" });
    expect(parsed.email).toBe("person@example.com");
    expect(parsed.rememberMe).toBe(false);
    expect(loginSchema.safeParse({ email: "person@example.com", password: "" }).success).toBe(false);
  });
});

describe("platform settings form", () => {
  it("accepts the design defaults", () => {
    expect(platformSettingsSchema.safeParse(settingsDefaults).success).toBe(true);
  });
  it("rejects rates above 100, ratings above 10 and fractional counts", () => {
    expect(platformSettingsSchema.safeParse({ ...settingsDefaults, gstRate: 101 }).success).toBe(false);
    expect(platformSettingsSchema.safeParse({ ...settingsDefaults, fullPointsRating: 11 }).success).toBe(false);
    expect(platformSettingsSchema.safeParse({ ...settingsDefaults, bookingWindowDays: 1.5 }).success).toBe(false);
  });
});
