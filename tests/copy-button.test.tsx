import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyValue } from "../src/components/feedback/copy-button";
import { StatusBadge } from "../src/components/feedback/status-badge";
import { TooltipProvider } from "../src/components/shadcn/tooltip";

describe("shared feedback components", () => {
  it("shows the value with a named copy button", () => {
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <CopyValue value="a@b.co" label="Email" />
      </TooltipProvider>,
    );
    expect(html).toContain("a@b.co");
    expect(html).toContain('aria-label="Copy email"');
  });

  it("gives the same status the same colour", () => {
    const html = renderToStaticMarkup(<StatusBadge status="pending">Pending</StatusBadge>);
    expect(html).toContain("bg-warning-subtle");
    expect(html).toContain("Pending");
  });
});

describe("shared form controls", () => {
  it("renders a labelled password field with a reveal toggle", async () => {
    const { PasswordField } = await import("../src/components/forms/field");
    const html = renderToStaticMarkup(<PasswordField label="Password" name="password" error="That password is not correct." />);
    expect(html).toContain("Password");
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain("That password is not correct.");
    expect(html).toContain('aria-invalid="true"');
  });

  it("disables the form and shows the label while a button is pending", async () => {
    const { PendingButton } = await import("../src/components/forms/pending-button");
    const html = renderToStaticMarkup(<PendingButton pending pendingLabel="Confirming…">Confirm</PendingButton>);
    expect(html).toContain("Confirming…");
    expect(html).toContain("disabled");
    expect(html).not.toContain(">Confirm<");
  });
});
