"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle, CircleCheck, KeyRound, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Form } from "@/components/ui/Form";
import {
  SettingButton,
  SettingDialog,
  SettingField,
  SettingInput,
  SettingPasswordInput,
} from "@/components/ui/settings-layout";
import {
  useChangePassword,
  useRequestChangeCode,
  type CodeChallenge,
} from "@/features/auth/api/auth";
import { ApiError } from "@/lib/api/contracts";

const MAX_PASSWORD_BYTES = 72;

type Step = "form" | "code" | "done";

function requirements(current: string, next: string, confirm: string) {
  return [
    { label: "At least 8 characters", met: next.length >= 8 },
    { label: "Includes a number", met: /[0-9]/.test(next) },
    {
      label: "Different from your current password",
      met: next.length > 0 && next !== current,
    },
    {
      label: "Both new passwords match",
      met: next.length > 0 && next === confirm,
    },
  ];
}

/** a***@example.com: enough to recognise the mailbox without printing the whole address. */
function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

/**
 * Change-password dialog in two steps. First the passwords (current, new, confirm); "Continue" emails a
 * code to the account's own address; the code is then sent together with the passwords in one request. The
 * backend ends every session when it succeeds (this one too), so the person is then taken to the login.
 */
export function ChangePasswordDialog({
  email,
  open,
  onClose,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const requestCode = useRequestChangeCode();
  const change = useChangePassword();
  const [step, setStep] = useState<Step>("form");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Counts down to the moment a new code may be asked for
  useEffect(() => {
    if (step !== "code") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const checks = requirements(current, next, confirm);
  const bytes = new TextEncoder().encode(next).length;
  const formReady =
    current.length > 0 &&
    checks.every((check) => check.met) &&
    bytes <= MAX_PASSWORD_BYTES;
  const wait = challenge
    ? Math.max(
        0,
        Math.ceil((new Date(challenge.resendAfter).getTime() - now) / 1000),
      )
    : 0;
  const minutes = challenge
    ? Math.max(
        1,
        Math.round((new Date(challenge.expiresAt).getTime() - now) / 60_000),
      )
    : 0;
  const busy = requestCode.isPending || change.isPending;

  function close(): void {
    if (busy || step === "done") return;
    setStep("form");
    setCurrent("");
    setNext("");
    setConfirm("");
    setCode("");
    setChallenge(null);
    setError("");
    onClose();
  }

  function sendCode(): void {
    setError("");
    requestCode.mutate(undefined, {
      onSuccess: (response) => {
        setChallenge(response.data);
        setNow(Date.now());
        setCode("");
        setStep("code");
      },
      onError: (err) =>
        setError(
          err instanceof ApiError ? err.message : "Unable to send the code",
        ),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy) return;
    if (step === "form") {
      if (formReady) sendCode();
      return;
    }
    if (!challenge || !/^[0-9]{6}$/.test(code)) return;
    setError("");
    change.mutate(
      {
        currentPassword: current,
        newPassword: next,
        challengeId: challenge.challengeId,
        otp: code,
      },
      {
        onSuccess: () => {
          setStep("done");
          client.clear();
          window.setTimeout(() => window.location.assign("/login"), 1800);
        },
        onError: (err) => {
          const message =
            err instanceof ApiError
              ? err.message
              : "Unable to change the password";
          setError(message);
          // A problem with the passwords is fixed on the first step; a problem with the code stays here
          if (!/code/i.test(message)) setStep("form");
        },
      },
    );
  }

  const title =
    step === "done"
      ? "Password changed"
      : step === "code"
        ? "Check your email"
        : "Change your password";
  const description =
    step === "done"
      ? "You have been signed out everywhere."
      : step === "code"
        ? `We sent a 6-digit code to ${maskEmail(email)}. It expires in ${minutes} minutes.`
        : "You will be signed out on every device, including this one, and asked to log in again.";

  return (
    <SettingDialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      icon={
        step === "done" ? (
          <Check size={22} aria-hidden />
        ) : step === "code" ? (
          <MailCheck size={22} aria-hidden />
        ) : (
          <KeyRound size={22} aria-hidden />
        )
      }
      footer={
        step === "done" ? null : (
          <>
            <SettingButton
              variant="ghost"
              onClick={step === "code" ? () => setStep("form") : close}
              disabled={busy}
            >
              {step === "code" ? "Back" : "Cancel"}
            </SettingButton>
            <SettingButton
              variant="primary"
              type="submit"
              form="change-password-form"
              pending={busy}
              pendingLabel={step === "code" ? "Updating…" : "Sending code…"}
              disabled={step === "form" ? !formReady : !/^[0-9]{6}$/.test(code)}
            >
              {step === "code" ? "Update password" : "Continue"}
            </SettingButton>
          </>
        )
      }
    >
      {step === "done" ? (
        <p className="sp-dialog__description" role="status">
          Taking you to the login screen…
        </p>
      ) : (
        <Form
          id="change-password-form"
          onSubmit={submit}
          noValidate
          pending={busy}
        >
          <div className="sp-dialog__fields">
            {step === "form" ? (
              <>
                <SettingField
                  label="Current password"
                  htmlFor="current-password"
                >
                  <SettingPasswordInput
                    id="current-password"
                    name="currentPassword"
                    autoComplete="current-password"
                    value={current}
                    onChange={(event) => setCurrent(event.target.value)}
                    aria-required
                  />
                </SettingField>
                <SettingField label="New password" htmlFor="new-password">
                  <SettingPasswordInput
                    id="new-password"
                    name="newPassword"
                    autoComplete="new-password"
                    value={next}
                    onChange={(event) => setNext(event.target.value)}
                    aria-required
                  />
                </SettingField>
                <SettingField
                  label="Confirm new password"
                  htmlFor="confirm-password"
                >
                  <SettingPasswordInput
                    id="confirm-password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    aria-required
                  />
                </SettingField>
                <ul className="sp-checklist" aria-label="Password requirements">
                  {checks.map((check) => (
                    <li key={check.label} data-met={check.met}>
                      {check.met ? (
                        <CircleCheck size={14} aria-hidden />
                      ) : (
                        <Circle size={14} aria-hidden />
                      )}
                      <span>
                        {check.label}
                        <span className="sr-only">
                          {check.met ? " (done)" : " (not yet)"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <SettingField label="Code" htmlFor="change-code">
                  <SettingInput
                    id="change-code"
                    name="otp"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    aria-required
                    autoFocus
                  />
                </SettingField>
                <p className="sp-dialog__description">
                  Did not get it?{" "}
                  <SettingButton
                    variant="ghost"
                    size="sm"
                    onClick={sendCode}
                    disabled={busy || wait > 0}
                  >
                    {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                  </SettingButton>
                </p>
              </>
            )}
            {error && (
              <p className="sp-dialog__error" role="alert">
                {error}
              </p>
            )}
          </div>
        </Form>
      )}
    </SettingDialog>
  );
}
