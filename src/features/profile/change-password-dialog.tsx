"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CircleCheck, Circle, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Form } from "@/components/ui/Form";
import {
  SettingButton,
  SettingDialog,
  SettingField,
  SettingPasswordInput,
} from "@/components/ui/settings-layout";
import { useChangePassword } from "@/features/auth/api/auth";
import { ApiError } from "@/lib/api/contracts";

const MAX_PASSWORD_BYTES = 72;

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

/**
 * Change-password dialog. The backend ends every session when it succeeds (this one too), so after a
 * short confirmation the person is taken to the login screen.
 */
export function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const checks = requirements(current, next, confirm);
  const bytes = new TextEncoder().encode(next).length;
  const ready =
    current.length > 0 &&
    checks.every((check) => check.met) &&
    bytes <= MAX_PASSWORD_BYTES;

  function close(): void {
    if (change.isPending || done) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!ready || change.isPending) return;
    setError("");
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true);
          client.clear();
          window.setTimeout(() => window.location.assign("/login"), 1800);
        },
        onError: (err) =>
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to change the password",
          ),
      },
    );
  }

  return (
    <SettingDialog
      open={open}
      onClose={close}
      title={done ? "Password changed" : "Change your password"}
      description={
        done
          ? "You have been signed out everywhere."
          : "You will be signed out on every device, including this one, and asked to log in again."
      }
      icon={
        done ? (
          <Check size={22} aria-hidden />
        ) : (
          <KeyRound size={22} aria-hidden />
        )
      }
      footer={
        done ? null : (
          <>
            <SettingButton
              variant="ghost"
              onClick={close}
              disabled={change.isPending}
            >
              Cancel
            </SettingButton>
            <SettingButton
              variant="primary"
              type="submit"
              form="change-password-form"
              pending={change.isPending}
              pendingLabel="Updating…"
              disabled={!ready}
            >
              Update password
            </SettingButton>
          </>
        )
      }
    >
      {done ? (
        <p className="sp-dialog__description" role="status">
          Taking you to the login screen…
        </p>
      ) : (
        <Form
          id="change-password-form"
          onSubmit={submit}
          noValidate
          pending={change.isPending}
        >
          <div className="sp-dialog__fields">
            <SettingField label="Current password" htmlFor="current-password">
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
