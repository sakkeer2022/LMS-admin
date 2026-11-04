"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Link2, X } from "lucide-react";
import { toast } from "sonner";
import { TextField } from "@/components/forms/field";
import { Button } from "@/components/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/contracts";
import { describeApiError } from "@/lib/api/errors";
import { useInviteTutors } from "../api/faculty";
import { addEmails, inviteRequestSchema, MAX_INVITES_PER_REQUEST } from "../schemas/faculty";

/** Per-address messages the backend returns in errors.emails (409 / 502). */
export function serverEmailMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  return error.fields?.emails ?? [];
}

/** Addresses named in the server messages, so their chips can be highlighted. */
export function flaggedEmails(messages: readonly string[], emails: readonly string[]): Set<string> {
  return new Set(emails.filter((email) => messages.some((m) => m.startsWith(`${email} `) || m.startsWith(`${email}:`))));
}

/** Copies text, returning whether it worked (the Clipboard API needs a secure context). */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * "Invite tutors" modal (screen 27, LMS-79). Type or paste addresses; each valid one
 * becomes a chip. Invite emails every chip; Copy link creates one invitation without an
 * email and copies its secure link.
 */
export function InviteTutorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [serverMessages, setServerMessages] = useState<string[]>([]);
  const [manualLink, setManualLink] = useState<string>();
  const [pendingAction, setPendingAction] = useState<"email" | "link">();
  const invite = useInviteTutors();
  const busy = invite.isPending;

  function reset() {
    setEmails([]);
    setDraft("");
    setError(undefined);
    setServerMessages([]);
    setManualLink(undefined);
    setPendingAction(undefined);
    invite.reset();
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  /** Moves the typed text into chips; returns the resulting list, or undefined if text is invalid. */
  function commitDraft(text = draft): string[] | undefined {
    if (!text.trim()) return emails;
    const update = addEmails(emails, text);
    setEmails(update.emails);
    setDraft(update.rest);
    setError(update.error);
    setServerMessages([]);
    return update.error ? undefined : update.emails;
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (["Enter", ",", ";", " ", "Tab"].includes(event.key) && draft.trim()) {
      // Tab still moves focus after the address becomes a chip
      if (event.key !== "Tab") event.preventDefault();
      commitDraft();
    } else if (event.key === "Enter") {
      event.preventDefault();
    } else if (event.key === "Backspace" && !draft && emails.length) {
      setEmails(emails.slice(0, -1));
    }
  }

  function remove(email: string) {
    setEmails(emails.filter((e) => e !== email));
    setServerMessages((messages) => messages.filter((m) => !m.startsWith(`${email} `) && !m.startsWith(`${email}:`)));
    setError(undefined);
    input.current?.focus();
  }

  async function submit(delivery: "email" | "link") {
    const list = commitDraft();
    if (!list) return input.current?.focus();
    const parsed = inviteRequestSchema.safeParse({ emails: list, delivery });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return input.current?.focus();
    }
    if (delivery === "link" && list.length !== 1) {
      setError("Copy link creates one invitation at a time. Enter a single email address.");
      return input.current?.focus();
    }
    setPendingAction(delivery);
    setError(undefined);
    setServerMessages([]);
    try {
      const result = await invite.mutateAsync(parsed.data);
      if (delivery === "link" && result.inviteUrl) {
        if (await copyText(result.inviteUrl)) {
          toast.success(`Invitation link for ${list[0]} copied`, {
            description: "Share it with the tutor. It works once and expires after the set time.",
          });
          reset();
          onClose();
        } else {
          // Clipboard blocked: show the link so it can be copied by hand
          setEmails([]);
          setManualLink(result.inviteUrl);
        }
        return;
      }
      const failed = result.invitations.filter((i) => i.delivered === false);
      if (failed.length) {
        toast.warning(result.message, {
          description: `Not delivered: ${failed.map((i) => i.email).join(", ")}. Try inviting them again.`,
        });
      } else {
        toast.success(result.message, { description: "They will receive an email with a secure link to complete their profile." });
      }
      reset();
      onClose();
    } catch (err) {
      const messages = serverEmailMessages(err);
      const described = describeApiError(err, "invite tutors");
      setServerMessages(messages);
      setError(messages.length ? undefined : described.message);
    } finally {
      setPendingAction(undefined);
    }
  }

  const flagged = flaggedEmails(serverMessages, emails);
  const describedBy = [helpId, error || serverMessages.length ? errorId : undefined].filter(Boolean).join(" ");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!busy}
        onInteractOutside={(event) => busy && event.preventDefault()}
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Invite tutors</DialogTitle>
          <DialogDescription className="sr-only">Invite tutors by email or copy a single invitation link.</DialogDescription>
        </DialogHeader>
        {manualLink ? (
          <TextField
            label="Invitation link"
            readOnly
            value={manualLink}
            onFocus={(event) => event.currentTarget.select()}
            hint="Your browser blocked copying. Select the link and copy it, then share it with the tutor. It is shown only once."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>Email address</Label>
              <Input
                ref={input}
                id={inputId}
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter email address"
                value={draft}
                disabled={busy}
                maxLength={2000}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={describedBy}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) setError(undefined);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => draft.trim() && commitDraft()}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text");
                  if (/[\s,;]/.test(text.trim())) {
                    event.preventDefault();
                    commitDraft(`${draft} ${text}`);
                  }
                }}
              />
              {(error || serverMessages.length > 0) && (
                <div id={errorId} className="flex flex-col gap-0.5" role="alert">
                  {error && <p className="text-xs text-error-foreground">{error}</p>}
                  {serverMessages.map((message) => (
                    <p key={message} className="text-xs text-error-foreground">
                      {message}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {emails.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold">Entered emails</p>
                <ul className="flex flex-wrap gap-2" aria-label={`Entered emails, ${emails.length} of ${MAX_INVITES_PER_REQUEST}`}>
                  {emails.map((email) => (
                    <li
                      key={email}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-pill border bg-sunken py-0.5 pr-1 pl-3 text-xs",
                        flagged.has(email) && "border-destructive bg-error-subtle text-error-foreground",
                      )}
                    >
                      <span>{email}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="rounded-pill"
                        aria-label={`Remove ${email}`}
                        disabled={busy}
                        onClick={() => remove(email)}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p id={helpId} className="text-xs text-muted-foreground">
              You can invite multiple tutors at once. They will receive an email with a secure link to complete their
              profile.
            </p>
          </div>
        )}

        <DialogFooter>
          {manualLink ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => void submit("link")}
                // Keep focus in the input: a blur would add the typed address as a chip and move this button before the click lands
                onMouseDown={(event) => event.preventDefault()}
                disabled={busy}
              >
                <Link2 aria-hidden="true" />
                {pendingAction === "link" ? "Creating link…" : "Copy link"}
              </Button>
              <Button
                onClick={() => void submit("email")}
                // Keep focus in the input: a blur would add the typed address as a chip and move this button before the click lands
                onMouseDown={(event) => event.preventDefault()}
                disabled={busy}
              >
                {pendingAction === "email" ? "Inviting…" : "Invite"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
