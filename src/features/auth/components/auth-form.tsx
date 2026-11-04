"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AuthCheckbox,
  AuthError,
  AuthField,
  AuthFormShell,
  AuthHead,
  AuthSubmit,
} from "@/components/auth/auth-controls";

import { api } from "@/lib/api/client";
import { loginSchema } from "../schemas/auth";
import { safeRedirect } from "@/lib/auth/access";
import { ApiError } from "@/lib/api/contracts";

// One refresh per page load: React strict mode runs effects twice in development, and a second
// refresh with the already-rotated cookie would be treated as token theft and end the session
let silentRefresh: Promise<unknown> | undefined;

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
    (silentRefresh ??= api("/auth/refresh", { method: "POST" }).finally(() => {
      setTimeout(() => (silentRefresh = undefined), 5000);
    }))
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
    <AuthFormShell
      ref={form}
      onSubmit={submit}
      noValidate
      aria-label="Admin login"
      pending={pending}
    >
      <AuthHead
        title="Admin login"
        lead="Sign in to access the Amentorz administration portal."
      />
      <div className="flex flex-col gap-4">
        <AuthField
          name="email"
          label="Email address"
          type="email"
          icon="mail"
          autoComplete="email"
          error={fields.email}
          required
        />
        <AuthField
          name="password"
          label="Password"
          type="password"
          icon="lock"
          autoComplete="current-password"
          error={fields.password}
          reveal
          required
        />
      </div>
      {error && <AuthError>{error}</AuthError>}
      <div className="flex h-14 items-center justify-between gap-3">
        <AuthCheckbox name="keepSignedIn" label="Keep me signed in" />
        <Link
          className="text-sm font-semibold text-accent-foreground hover:underline"
          href="/recovery"
        >
          Forgot password?
        </Link>
      </div>
      <AuthSubmit pending={pending}>
        {pending ? "Logging in…" : "Log in"}
      </AuthSubmit>
    </AuthFormShell>
  );
}
