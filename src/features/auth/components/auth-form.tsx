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
import { loginSchema, registerSchema } from "../schemas/auth";
import { safeRedirect } from "@/lib/auth/access";
import { ApiError } from "@/lib/api/contracts";
import { devAdminEnabled, loginDevAdmin, devAdminDashboard } from '@/lib/auth/dev-admin';

export function AuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const developmentLogin = !register && devAdminEnabled();

  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [fields]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setFields({});

    const values = Object.fromEntries(new FormData(event.currentTarget));

    if (developmentLogin && (values.email === 'admin' || values.password === 'Admin@123' || !String(values.email).includes('@'))) {
      try {
        if (!loginDevAdmin(String(values.email), String(values.password))) {
          setError('Invalid development username or password.');
          return;
        }
        window.location.assign(devAdminDashboard);
      } catch (err) { setError(err instanceof Error ? err.message : 'Development login unavailable.'); }
      return;
    }

    const parsed = (register ? registerSchema : loginSchema).safeParse(
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
      await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      window.location.assign(
        safeRedirect(
          new URLSearchParams(window.location.search).get("redirect"),
          "/account",
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
      <Typography variant="h1">
        {register ? "Create your account" : "Welcome back"}
      </Typography>
      {developmentLogin && (
        <Typography tone="muted">
          Development login · Username: admin · Password: Admin@123
        </Typography>
      )}
      <Form
        ref={form}
        onSubmit={submit}
        pending={pending}
        noValidate
        aria-label={register ? "Create account" : "Sign in"}
      >
        {register && (
          <>
            <TextField
              name="firstName"
              label="First name"
              autoComplete="given-name"
              maxLength={100}
              error={fields.firstName}
              required
            />
            <TextField
              name="lastName"
              label="Last name"
              autoComplete="family-name"
              maxLength={100}
              error={fields.lastName}
              required
            />
          </>
        )}
        
        <TextField
          name="email"
          label={developmentLogin ? "Email or development username" : "Email"}
          type={developmentLogin ? "text" : "email"}
          autoComplete={developmentLogin ? "username" : "email"}
          error={fields.email}
          required
        />
        <PasswordField
          name="password"
          label="Password"
          autoComplete={register ? "new-password" : "current-password"}
          description={
            register
              ? "Use 12+ characters including upper/lowercase, a number, and a symbol."
              : undefined
          }
          error={fields.password}
          required
        />
        <FormError message={error} />
        <SubmitButton pending={pending}>
          {register ? "Register" : "Sign in"}
        </SubmitButton>
      </Form>
    </Card>
  );
}




