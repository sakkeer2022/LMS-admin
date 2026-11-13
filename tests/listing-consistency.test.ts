import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A guard, so "every listing has a search" does not depend on someone remembering it. A listing is any
// feature that renders a paginated table. A listing feature must use SearchInput somewhere; an exception needs a reason.
const EXCEPTIONS: Record<string, string> = {
  dashboard: "Today's sessions is demonstration data with no search endpoint",
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

const root = join(__dirname, "../src/features");
const all = files(root).map((path) => {
  const relative = path.slice(root.length + 1);
  return { path: relative, feature: relative.split("/")[0], source: readFileSync(path, "utf8") };
});
const listingFeatures = [...new Set(all.filter(({ source }) => /<TablePagination|<DataTable/.test(source)).map(({ feature }) => feature))];
const hasSearch = (feature: string) => all.some((file) => file.feature === feature && file.source.includes("<SearchInput"));

// The same guard for the other things every listing shares. Pricing edits prices in place, so it keeps its own table.
const OWN_TABLE: Record<string, string> = {
  "pricing/components/pricing-page.tsx": "An editable table with selection and bulk actions, not a read-only listing",
};
const FIXED_PAGE_SIZE: Record<string, string> = {
  "dashboard/dashboard.tsx": "Today's sessions is demonstration data with a fixed page of 6",
};

describe("listing screens", () => {
  it("finds the listings", () => {
    expect(listingFeatures.length).toBeGreaterThanOrEqual(4);
  });

  it("every listing has a search box, or a written reason why not", () => {
    const missing = listingFeatures.filter((feature) => !hasSearch(feature) && !(feature in EXCEPTIONS));
    expect(missing, `Add a SearchInput (components/forms/search-input.tsx) to the listing in: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps the exception list honest", () => {
    for (const feature of Object.keys(EXCEPTIONS)) {
      expect(listingFeatures, `${feature} is no longer a listing: remove it from EXCEPTIONS`).toContain(feature);
      expect(hasSearch(feature), `${feature} now has a SearchInput: remove it from EXCEPTIONS`).toBe(false);
    }
  });

  it("does not hand-roll a table: listings use DataTable, which also gives the phone cards", () => {
    const own = all
      .filter(({ source }) => source.includes("components/shadcn/table"))
      .map(({ path }) => path)
      .filter((path) => !(path in OWN_TABLE));
    expect(own, `Use DataTable instead of the raw Table in: ${own.join(", ")}`).toEqual([]);
  });

  it("every pagination footer offers the rows-per-page control", () => {
    const fixed = all
      .filter(({ source }) => source.includes("<TablePagination") && !/onLimit=/.test(source))
      .map(({ path }) => path)
      .filter((path) => !(path in FIXED_PAGE_SIZE));
    expect(fixed, `Pass onLimit to TablePagination in: ${fixed.join(", ")}`).toEqual([]);
  });
});
