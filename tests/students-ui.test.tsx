import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TooltipProvider } from "../src/components/shadcn/tooltip";
import { StudentsFilters, NO_FILTERS } from "../src/features/students/students-filters";
import { TablePagination } from "../src/components/data-table/table-pagination";
import { StudentsList } from "../src/features/students/students-table";
import type { AdminStudent } from "../src/features/students/types";

const student: AdminStudent = {
  id: "s1",
  userId: "u1",
  fullName: "Asha Menon",
  email: "asha@example.com",
  mobileNumber: "+919845012345",
  isActive: false,
  country: "IN",
  dateOfBirth: "2012-03-01",
  age: 14,
  isMinor: true,
  consentStatus: "missing",
  guardian: {
    fullName: "Ravi Menon",
    relationship: "father",
    mobileNumber: "+919845012346",
    email: "ravi@example.com",
    receivesReportsAndReceipts: true,
  },
  registeredAt: "2026-11-01T10:00:00.000Z",
};

describe("students list", () => {
  const list = (props: Partial<Parameters<typeof StudentsList>[0]> = {}) =>
    renderToStaticMarkup(
      <TooltipProvider>
        <StudentsList
          students={[student]}
          loading={false}
          caption="Students, page 1"
          countryName={() => "India"}
          selectedId={null}
          onSelect={() => {}}
          {...props}
        />
      </TooltipProvider>,
    );

  it("shows who the student is, the guardian and the consent state", () => {
    const html = list();
    expect(html).toContain("Asha Menon");
    expect(html).toContain("Disabled");
    expect(html).toContain("India");
    expect(html).toContain("Ravi Menon");
    expect(html).toContain("Missing");
    expect(html).toContain('aria-label="View Asha Menon"');
  });

  it("shows placeholders, not rows, while loading", () => {
    expect(list({ loading: true })).not.toContain("Asha Menon");
  });
});

describe("students filters", () => {
  it("offers Clear filters and a chip only once a filter is set", () => {
    const render = (country: string) =>
      renderToStaticMarkup(
        <TooltipProvider>
          <StudentsFilters
            value={{ ...NO_FILTERS, country }}
            countries={[{ code: "IN", name: "India" }]}
            onChange={() => {}}
          />
        </TooltipProvider>,
      );
    expect(render("")).not.toContain("Clear filters");
    const active = render("IN");
    expect(active).toContain("Clear filters");
    expect(active).toContain('aria-label="Remove filter India"');
  });

  it("uses the styled Select, never a browser-native one", () => {
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <StudentsFilters value={NO_FILTERS} countries={[]} onChange={() => {}} />
      </TooltipProvider>,
    );
    expect(html.match(/data-slot="select-trigger"/g)).toHaveLength(3);
    expect(html).not.toContain("native-select");
  });
});

describe("students pagination", () => {
  it("reports the range and the page", () => {
    const html = renderToStaticMarkup(
      <TablePagination noun="students" page={2} limit={20} total={45} onPage={() => {}} onLimit={() => {}} />,
    );
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain("Showing 21–40 of 45 students");
    expect(text).toContain("Page 2 of 3");
  });
});
