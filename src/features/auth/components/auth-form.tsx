"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  LoginCheckbox,
  LoginField,
  LoginForm,
  LoginHeading,
  LoginSubmit,
} from "@/components/ui/login-controls";

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

    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
      rememberMe: data.get("keepSignedIn") === "on",
    });

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
    <LoginForm
      ref={form}
      onSubmit={submit}
      noValidate
      aria-label="Admin login"
      pending={pending}
    >
      <div>
        <LoginHeading>Admin login</LoginHeading>
        <p className="login-subtitle">
          Sign in to access the Amentorz administration portal.
        </p>
      </div>
      <div className="login-fields">
        <LoginField
          name="email"
          label="Email address"
          type="email"
          icon="/auth/icon-mail.svg"
          autoComplete="email"
          error={fields.email}
          required
        />
        <LoginField
          name="password"
          label="Password"
          type="password"
          icon="/auth/icon-lock.svg"
          autoComplete="current-password"
          error={fields.password}
          reveal
          required
        />
      </div>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <div className="login-options">
        <LoginCheckbox name="keepSignedIn" label="Keep me signed in" />
        <Link className="login-link" href="/recovery">
          Forgot password?
        </Link>
      </div>
      <LoginSubmit pending={pending}>
        {pending ? "Logging in…" : "Log in"}
      </LoginSubmit>
    </LoginForm>
  );
}
