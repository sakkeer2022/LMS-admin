"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Card, Typography } from "@/components/ui";
import {
  Form,
  TextField,
  PasswordField,
  FormError,
  SubmitButton,
} from "@/components/ui";

import { api } from "@/lib/api/client";
import { loginSchema } from "../schemas/auth";
import { safeRedirect } from "@/lib/auth/access";
import { ApiError } from "@/lib/api/contracts";

export function AuthForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [fields]);

  // The access cookie lasts minutes; a valid refresh cookie signs the person straight back in
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("redirect");
    if (!target) return;
    let cancelled = false;
    api("/auth/refresh", { method: "POST" })
      .then(() => {
        if (!cancelled) window.location.assign(safeRedirect(target));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setFields({});

    const parsed = loginSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (!parsed.success) {
      const messages: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const name = issue.path.join(".");
        messages[name] = [messages[name], issue.message]
          .filter(Boolean)
          .join("; ");
      }
      setFields(messages);
      setError("Please correct the highlighted fields.");
      return;
    }

    submitting.current = true;

    setPending(true);

    try {
      await api("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      window.location.assign(
        safeRedirect(
          new URLSearchParams(window.location.search).get("redirect"),
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect");
      if (err instanceof ApiError)
        setFields(
          Object.fromEntries(
            Object.entries(err.fields ?? {}).map(([name, messages]) => [
              name,
              messages.join("; "),
            ]),
          ),
        );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Card>
      <Typography variant="h1">Welcome back</Typography>
      <Form
        ref={form}
        onSubmit={submit}
        pending={pending}
        noValidate
        aria-label="Sign in"
      >
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={fields.email}
          required
        />
        <PasswordField
          name="password"
          label="Password"
          autoComplete="current-password"
          error={fields.password}
          required
        />
        <FormError message={error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </Form>
    </Card>
  );
}




