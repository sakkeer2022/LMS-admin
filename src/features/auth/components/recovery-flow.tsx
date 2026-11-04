"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AuthError,
  AuthField,
  AuthFormShell,
  AuthHead,
  AuthLinkButton,
  AuthSecondaryButton,
  AuthStack,
  AuthSubmit,
  AuthSuccess,
} from "@/components/auth/auth-controls";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/contracts";
import {
  newPasswordSchema,
  recoveryCodeSchema,
  recoveryEmailSchema,
} from "../schemas/recovery";

type Portal = "student" | "faculty" | "admin";
type Step = "email" | "code" | "password" | "done";

interface Challenge {
  challengeId: string;
  resendAfter: string;
}

function fieldErrors(error: unknown): {
  message: string;
  fields: Record<string, string>;
} {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      fields: Object.fromEntries(
        Object.entries(error.fields ?? {}).map(([name, messages]) => [
          name,
          messages.join("; "),
        ]),
      ),
    };
  }
  return { message: "Unable to connect", fields: {} };
}

/**
 * Forgot password in four steps on one page: email, code, new password, done. The reset credential only
 * lives in this component's state (never in a URL or storage), so a refresh starts again.
 */
export function RecoveryFlow({ portal }: { portal: Portal }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [resetCredential, setResetCredential] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const busy = useRef(false);

  // Counts down to the moment a new code may be asked for
  useEffect(() => {
    if (step !== "code") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const wait = challenge
    ? Math.max(
        0,
        Math.ceil((new Date(challenge.resendAfter).getTime() - now) / 1000),
      )
    : 0;

  function reset(): void {
    setError("");
    setFields({});
  }

  async function run(work: () => Promise<void>): Promise<void> {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    reset();
    try {
      await work();
    } catch (err) {
      const failure = fieldErrors(err);
      setError(failure.message);
      setFields(failure.fields);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function sendCode(address: string): Promise<void> {
    const response = await api<Challenge>("/auth/recovery/requests", {
      method: "POST",
      body: JSON.stringify({ email: address, portal }),
    });
    setChallenge(response.data);
    setNow(Date.now());
    setStep("code");
  }

  function submitEmail(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = recoveryEmailSchema.safeParse({
      email: new FormData(event.currentTarget).get("email"),
    });
    if (!parsed.success) {
      reset();
      setFields({ email: parsed.error.issues[0]!.message });
      return;
    }
    void run(async () => {
      setEmail(parsed.data.email);
      await sendCode(parsed.data.email);
    });
  }

  function submitCode(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = recoveryCodeSchema.safeParse({
      otp: new FormData(event.currentTarget).get("otp"),
    });
    if (!parsed.success) {
      reset();
      setFields({ otp: parsed.error.issues[0]!.message });
      return;
    }
    void run(async () => {
      const response = await api<{ resetCredential: string }>(
        "/auth/recovery/verify",
        {
          method: "POST",
          body: JSON.stringify({
            challengeId: challenge?.challengeId,
            otp: parsed.data.otp,
          }),
        },
      );
      setResetCredential(response.data.resetCredential);
      setStep("password");
    });
  }

  function submitPassword(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = newPasswordSchema.safeParse({
      newPassword: data.get("newPassword"),
      confirmPassword: data.get("confirmPassword"),
    });
    if (!parsed.success) {
      reset();
      setFields(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            issue.path.join("."),
            issue.message,
          ]),
        ),
      );
      return;
    }
    void run(async () => {
      await api<null>("/auth/recovery/reset", {
        method: "POST",
        body: JSON.stringify({
          resetCredential,
          newPassword: parsed.data.newPassword,
        }),
      });
      setResetCredential("");
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <AuthSuccess>
        <AuthHead
          title="Password updated"
          lead="You are signed out on every other device. Use your new password next time you log in."
        />
        <AuthLinkButton href="/login">Log in</AuthLinkButton>
      </AuthSuccess>
    );
  }

  const errorLine = error && Object.keys(fields).length === 0 && (
    <AuthError>{error}</AuthError>
  );

  if (step === "email") {
    return (
      <AuthFormShell
        onSubmit={submitEmail}
        noValidate
        aria-label="Reset your password"
        pending={pending}
      >
        <AuthHead
          title="Reset your password"
          lead={<>Enter the email on your Amentorz account. We will send a 6-digit             code that expires in 10 minutes.</>}
        />
        <AuthField
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          hint="Use the email you signed up with."
          autoComplete="email"
          defaultValue={email}
          error={fields.email}
          aria-required
        />
        {errorLine}
        <AuthStack>
          <AuthSubmit pending={pending}>
            {pending ? "Sending…" : "Send reset code"}
          </AuthSubmit>
          <AuthLinkButton href="/login" variant="ghost">Back to log in</AuthLinkButton>
        </AuthStack>
      </AuthFormShell>
    );
  }

  if (step === "code") {
    return (
      <AuthFormShell
        onSubmit={submitCode}
        noValidate
        aria-label="Enter your code"
        pending={pending}
      >
        <AuthHead
          title="Check your email"
          lead={<>If {email} has an Amentorz account, we sent it a 6-digit code. Enter             it below.</>}
        />
        <AuthField
          name="otp"
          label="Code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          error={fields.otp}
          aria-required
        />
        {errorLine}
        <AuthStack>
          <AuthSubmit pending={pending}>
            {pending ? "Checking…" : "Verify code"}
          </AuthSubmit>
          <AuthSecondaryButton
            disabled={pending || wait > 0}
            onClick={() => void run(() => sendCode(email))}
          >
            {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
          </AuthSecondaryButton>
        </AuthStack>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      onSubmit={submitPassword}
      noValidate
      aria-label="Set a new password"
      pending={pending}
    >
      <AuthHead
          title="Set a new password"
          lead={<>Choose a password you have not used on Amentorz before.</>}
        />
      <AuthField
        name="newPassword"
        label="New password"
        type="password"
        hint="At least 8 characters, with one number."
        autoComplete="new-password"
        error={fields.newPassword}
        aria-required
      />
      <AuthField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={fields.confirmPassword}
        aria-required
      />
      {errorLine}
      <AuthStack>
        <AuthSubmit pending={pending}>
          {pending ? "Saving…" : "Save and log in"}
        </AuthSubmit>
        <AuthLinkButton href="/login" variant="ghost">Cancel</AuthLinkButton>
      </AuthStack>
    </AuthFormShell>
  );
}
