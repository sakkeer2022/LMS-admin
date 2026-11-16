"use client";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { PasswordField, TextField } from "@/components/forms/field";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { useRoleOptions } from "@/features/roles/api";
import { roleLabel } from "@/features/roles/types";
import { useUserMutations } from "../api/users";

const PASSWORD_RULE =
  "At least 8 characters with an uppercase letter, a number and a symbol.";
const strong = (v: string) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { create } = useUserMutations();
  const roles = useRoleOptions(open);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);
  const errors = {
    fullName: form.fullName.trim() ? undefined : "Enter their full name.",
    email: /^\S+@\S+\.\S+$/.test(form.email)
      ? undefined
      : "Enter a valid email address.",
    password: strong(form.password) ? undefined : PASSWORD_RULE,
  };
  const set =
    (key: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm({ ...form, [key]: event.target.value });
  function close() {
    setForm({ fullName: "", email: "", password: "" });
    setRoleIds([]);
    setSubmitted(false);
    onClose();
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (errors.fullName || errors.email || errors.password) return;
    create.mutate(
      {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roleIds,
      },
      {
        onSuccess: (user) => {
          if (!user.welcomeEmailSent)
            toast.warning(
              `${user.fullName} was added, but the email could not be sent. Share the password with them yourself.`,
            );
          else
            toast.success(
              roleIds.length
                ? `${user.fullName} added. Their details were emailed.`
                : `${user.fullName} added with no role, details emailed. Give them a role so they can use the portal.`,
            );
          close();
          onCreated(user.id);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }
  return (
    <FormDialog
      open={open}
      onClose={close}
      busy={create.isPending}
      title="Add a user"
      description="They are emailed their details and this password. Pick their roles now."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-user" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add user"}
          </Button>
        </>
      }
    >
      <form
        id="create-user"
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4"
      >
        <TextField
          label="Full name"
          value={form.fullName}
          onChange={set("fullName")}
          error={submitted ? errors.fullName : undefined}
          autoComplete="off"
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          error={submitted ? errors.email : undefined}
          autoComplete="off"
        />
        <PasswordField
          label="Password"
          value={form.password}
          onChange={set("password")}
          hint={PASSWORD_RULE}
          error={submitted ? errors.password : undefined}
          autoComplete="new-password"
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Roles</legend>
          {(roles.data ?? []).map((role) => (
            <label key={role.id} className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={roleIds.includes(role.id)}
                onCheckedChange={(on) =>
                  setRoleIds(
                    on
                      ? [...roleIds, role.id]
                      : roleIds.filter((id) => id !== role.id),
                  )
                }
              />
              <span className="flex flex-col">
                <span className="font-medium">{roleLabel(role.name)}</span>
                {role.description && (
                  <span className="text-xs text-text-secondary">
                    {role.description}
                  </span>
                )}
              </span>
            </label>
          ))}
          {roles.isError && (
            <p className="text-xs text-error-foreground">
              Roles could not be loaded. You can add them after.
            </p>
          )}
        </fieldset>
      </form>
    </FormDialog>
  );
}
