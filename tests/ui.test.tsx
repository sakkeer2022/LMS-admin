import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, ButtonLink } from "../src/components/ui";
import {
  Form,
  TextField,
  PasswordField,
  SelectField,
  SubmitButton,
} from "../src/components/ui";
import { registerSchema, loginSchema } from "../src/features/auth/schemas/auth";

describe("shared field and submission contracts", () => {
  it("associates labels, required state, descriptions and validation errors while preserving external descriptions", () => {
    const html = renderToStaticMarkup(
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        required
        description="Use your work address"
        error="Invalid email"
        aria-describedby="policy"
        autoComplete="email"
        readOnly
        defaultValue="x"
      />,
    );
    expect(html).toContain('for="email"');
    expect(html).toContain(
      'aria-describedby="policy email-description email-error"',
    );
    expect(html).toContain('aria-invalid="true"');
    for (const attribute of [
      'required=""',
      'readOnly=""',
      'autoComplete="email"',
      'name="email"',
      'value="x"',
    ])
      expect(html).toContain(attribute);
    expect(html).toContain('id="email-error"');
  });
  it("generates unique field IDs and preserves select names and disabled state", () => {
    const html = renderToStaticMarkup(
      <>
        <TextField label="First name" />
        <TextField label="Last name" />
        <SelectField
          id="status"
          name="status"
          label="Status"
          disabled
          defaultValue="active"
        >
          <option value="active">Active</option>
        </SelectField>
      </>,
    );
    const ids = [...html.matchAll(/<input[^>]+id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain('for="status"');
    expect(html).toContain('name="status"');
    expect(html).toContain('disabled=""');
  });
  it("keeps password hidden and its reveal control out of form submission", () => {
    const html = renderToStaticMarkup(
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
      />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-controls="password"');
    expect(html).toContain('aria-label="Show password"');
    expect(
      renderToStaticMarkup(
        <PasswordField label="Password" allowReveal={false} />,
      ),
    ).not.toContain("<button");
  });
  it("disables a submitting form and exposes a busy, named submit button; ordinary actions never submit", () => {
    const html = renderToStaticMarkup(
      <Form pending>
        <TextField name="email" label="Email" />
        <SubmitButton pending>Sign in</SubmitButton>
      </Form>,
    );
    expect(html).toContain('<fieldset disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('type="submit"');
    expect(html).toContain("Please wait");
    expect(renderToStaticMarkup(<Button>Retry</Button>)).toContain(
      'type="button"',
    );
    expect(
      renderToStaticMarkup(
        <ButtonLink href="/login" variant="primary">
          Sign in
        </ButtonLink>,
      ),
    ).toContain("ui-button--primary");
  });
  it("retains backend registration rules without imposing them on existing-account login", () => {
    const input = {
      email: "Person@example.com",
      firstName: "Person",
      lastName: "Test",
      password: "LongEnough1!",
    };
    expect(registerSchema.parse(input).email).toBe("person@example.com");
    for (const password of [
      "Short1!",
      "longenough1!",
      "LONGENOUGH1!",
      "LongEnough!!",
      "LongEnough123",
    ])
      expect(registerSchema.safeParse({ ...input, password }).success).toBe(
        false,
      );
    expect(
      loginSchema.safeParse({ email: input.email, password: "legacy" }).success,
    ).toBe(true);
  });
});
