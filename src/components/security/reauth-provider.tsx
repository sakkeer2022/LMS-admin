"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { PasswordField } from "@/components/forms/field";
import { Form } from "@/components/forms/form";
import { FormDialog } from "@/components/forms/form-dialog";
import { PendingButton } from "@/components/forms/pending-button";
import { Button } from "@/components/shadcn/button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/contracts";
import { isReauthRequired } from "@/lib/api/reauth";

type Run = <T>(action: () => Promise<T>) => Promise<T>;

const ReauthContext = createContext<Run | null>(null);

/**
 * Runs a sensitive action; when the backend answers "recent re-authentication required" it asks for the
 * password in a dialog, confirms it (`POST /auth/reauthenticate`) and runs the action once more. Everything
 * else passes through untouched. The password is never kept: it lives in the dialog's field until it is sent.
 */
export function useWithReauth(): Run {
  const run = useContext(ReauthContext);
  if (!run) throw new Error("useWithReauth needs a ReauthProvider");
  return run;
}

interface Waiting {
  resolve: () => void;
  reject: (error: Error) => void;
}

export function ReauthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const waiting = useRef<Waiting | null>(null);

  const ask = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        // Two actions needing the password at once share one dialog
        waiting.current ??= { resolve, reject };
        setPassword("");
        setError("");
        setOpen(true);
      }),
    [],
  );

  const run = useCallback<Run>(
    async (action) => {
      try {
        return await action();
      } catch (error) {
        if (!isReauthRequired(error)) throw error;
        await ask();
        return action();
      }
    },
    [ask],
  );

  function close(): void {
    if (pending) return;
    setOpen(false);
    setPassword("");
    waiting.current?.reject(
      new ApiError(403, "Password confirmation was cancelled."),
    );
    waiting.current = null;
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setError("");
    try {
      await api<unknown>("/auth/reauthenticate", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setOpen(false);
      setPassword("");
      waiting.current?.resolve();
      waiting.current = null;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? "That password is not correct."
            : err.message
          : "Unable to confirm the password. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const value = useMemo(() => run, [run]);

  return (
    <ReauthContext.Provider value={value}>
      {children}
      <FormDialog
        open={open}
        onClose={close}
        busy={pending}
        title="Confirm your password"
        description="This action needs a fresh confirmation. It stays valid for a few minutes."
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <PendingButton
              type="submit"
              form="reauth-form"
              pending={pending}
              pendingLabel="Confirming…"
              disabled={!password}
            >
              Confirm
            </PendingButton>
          </>
        }
      >
        <Form id="reauth-form" onSubmit={(event) => void submit(event)} noValidate pending={pending}>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error || undefined}
            aria-required
          />
        </Form>
      </FormDialog>
    </ReauthContext.Provider>
  );
}
