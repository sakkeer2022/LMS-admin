import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Heading, Text, Typography } from "../src/components/ui";

describe("Typography", () => {
  it("maps variants to semantic elements", () => {
    const cases: [Parameters<typeof Typography>[0]["variant"], string][] = [
      ["h1", "h1"],
      ["h2", "h2"],
      ["h3", "h3"],
      ["h4", "h4"],
      ["h5", "h5"],
      ["h6", "h6"],
      ["subtitle1", "p"],
      ["subtitle2", "p"],
      ["body1", "p"],
      ["body2", "p"],
      ["caption", "span"],
      ["overline", "span"],
      ["inherit", "p"],
    ];
    for (const [variant, tag] of cases) {
      const html = renderToStaticMarkup(
        <Typography variant={variant}>x</Typography>,
      );
      expect(html).toBe(
        `<${tag} class="ui-typography ui-typography--${variant}">x</${tag}>`,
      );
    }
  });
  it("defaults to body1 and omits a class for the default tone", () => {
    expect(renderToStaticMarkup(<Typography>x</Typography>)).toBe(
      '<p class="ui-typography ui-typography--body1">x</p>',
    );
  });
  it("separates visual variant from rendered element", () => {
    expect(
      renderToStaticMarkup(
        <Typography variant="h3" component="h2">
          Student Management
        </Typography>,
      ),
    ).toBe('<h2 class="ui-typography ui-typography--h3">Student Management</h2>');
  });
  it("applies tones, appends custom classes and forwards attributes", () => {
    const html = renderToStaticMarkup(
      <Typography
        variant="caption"
        component="label"
        htmlFor="field"
        tone="warning"
        className="custom"
        id="hint"
        role="note"
      >
        Hint
      </Typography>,
    );
    expect(html).toBe(
      '<label for="field" id="hint" role="note" class="ui-typography ui-typography--caption ui-typography--warning custom">Hint</label>',
    );
  });
  it("keeps deprecated Heading and Text aliases working", () => {
    expect(renderToStaticMarkup(<Heading level={2}>T</Heading>)).toBe(
      '<h2 class="ui-typography ui-typography--h2">T</h2>',
    );
    expect(renderToStaticMarkup(<Heading>T</Heading>)).toContain("<h1");
    expect(renderToStaticMarkup(<Text tone="muted">T</Text>)).toBe(
      '<p class="ui-typography ui-typography--inherit ui-typography--muted">T</p>',
    );
  });
});
