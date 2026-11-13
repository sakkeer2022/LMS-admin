"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FormError } from "@/components/forms/field";
import { Form } from "@/components/forms/form";
import { PendingButton } from "@/components/forms/pending-button";
import { PhoneInput } from "@/components/forms/phone-input";
import { StatusBadge } from "@/components/feedback/status-badge";
import { PanelMessage } from "@/components/layout/panel-message";
import {
  SettingCard,
  SettingPills,
  SettingRow,
  SettingsPage,
  StickyBar,
} from "@/components/settings/setting-layout";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { NativeSelect } from "@/components/shadcn/native-select";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  useActivity,
  useLogout,
  useMe,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  useUpdateProfile,
} from "@/features/auth/api/auth";
import { ApiError } from "@/lib/api/contracts";
import { permissionsOf } from "@/lib/auth/access";
import { useServedCountries } from "@/lib/regions";
import { describeDevice } from "@/lib/auth/device";
import { ChangePasswordDialog } from "./change-password-dialog";
import { ACTIVITY_LABELS, WARNING_ACTIONS } from "./labels";
import { profileSchema, type ProfileValues } from "./schema";

/** Rows shaped like the settings rows while a card's list loads. */
function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4 py-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-6">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function zoneNames(current?: string | null) {
  const names =
    (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone") ?? [];
  return current && !names.includes(current) ? [current, ...names] : names;
}

function useFormatter(timeZone?: string | null) {
  return useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: "medium",
      timeStyle: "short",
    };
    try {
      return new Intl.DateTimeFormat(undefined, {
        ...options,
        ...(timeZone && { timeZone }),
      });
    } catch {
      return new Intl.DateTimeFormat(undefined, options);
    }
  }, [timeZone]);
}

export function ProfilePage() {
  const me = useMe();
  const user = me.data?.data;
  const format = useFormatter(user?.timezone);

  if (me.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading your profile…</p>;
  if (me.isError || !user) return <p role="alert" className="text-sm text-error-foreground">Please sign in again.</p>;

  return (
    <SettingsPage>
      <PageHeader
        title="My profile"
        description="Your details, access and the devices signed in to your admin account."
      />
      <DetailsCard
        key={`${user.fullName}|${user.mobileNumber}|${user.timezone}`}
      />
      <AccessCard />
      <SecurityCard
        email={user.email}
        lastLoginAt={user.lastLoginAt}
        format={format}
      />
      <DevicesCard format={format} />
      <ActivityCard format={format} />
    </SettingsPage>
  );
}

function DetailsCard() {
  const me = useMe();
  const update = useUpdateProfile();
  const user = me.data!.data;
  const initial: ProfileValues = {
    fullName: user.fullName,
    mobileNumber: user.mobileNumber ?? "",
    timezone: user.timezone ?? "",
  };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(initial) as Array<keyof ProfileValues>).some(
    (k) => values[k] !== initial[k],
  );
  const zones = useMemo(() => zoneNames(user.timezone), [user.timezone]);
  const countries = useServedCountries();

  useEffect(() => {
    if (dirty) setSaved(false);
  }, [dirty]);

  const set = (key: keyof ProfileValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: () => setSaved(true),
      onError: (error) => {
        if (error instanceof ApiError && error.fields)
          setErrors(
            Object.fromEntries(
              Object.entries(error.fields).map(([k, m]) => [k, m.join("; ")]),
            ),
          );
        else
          setErrors({
            form:
              error instanceof ApiError
                ? error.message
                : "Unable to save. Try again.",
          });
      },
    });
  }

  return (
    <Form
      onSubmit={submit}
      noValidate
      aria-label="Personal details"
      pending={update.isPending}
    >
      <SettingCard
        title="Personal details"
        caption="Shown to other admins in audit records"
      >
        <SettingRow
          label="Full name"
          htmlFor="fullName"
          description="The name on your admin account."
          error={errors.fullName}
        >
          <Input
            id="fullName"
            value={values.fullName}
            onChange={(e) => set("fullName")(e.target.value)}
            autoComplete="name"
            maxLength={150}
            required
            aria-invalid={Boolean(errors.fullName) || undefined}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
        </SettingRow>
        <SettingRow
          label="Email address"
          htmlFor="email"
          description="Used to sign in. Changing it needs email verification, which arrives with account recovery."
        >
          <Input id="email" value={user.email} readOnly />
          <StatusBadge status={user.emailVerified ? "approved" : "pending"}>
            {user.emailVerified ? "Verified" : "Not verified"}
          </StatusBadge>
        </SettingRow>
        <SettingRow
          label="Mobile number"
          htmlFor="mobileNumber"
          description="Choose the country code, then enter the number. Optional."
          error={errors.mobileNumber}
        >
          <PhoneInput
            id="mobileNumber"
            countries={countries}
            value={values.mobileNumber ?? ""}
            onChange={(mobileNumber) => set("mobileNumber")(mobileNumber)}
            invalid={Boolean(errors.mobileNumber)}
            describedBy={errors.mobileNumber ? "mobileNumber-error" : undefined}
          />
        </SettingRow>
        <SettingRow
          label="Time zone"
          htmlFor="timezone"
          description="Dates and times on this page are shown in this zone."
        >
          {/* Native on purpose: about 400 zones, and the browser's own list lets you type to find one */}
          <NativeSelect
            id="timezone"
            value={values.timezone ?? ""}
            onChange={(e) => set("timezone")(e.target.value)}
          >
            <option value="">Use my browser&apos;s time zone</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </NativeSelect>
        </SettingRow>
        <FormError message={errors.form} className="my-3" />
      </SettingCard>
      <StickyBar
        message={
          dirty
            ? "You have unsaved changes"
            : saved
              ? "Profile saved"
              : "No unsaved changes"
        }
      >
        <Button
          variant="ghost"
          disabled={!dirty || update.isPending}
          onClick={() => {
            setValues(initial);
            setErrors({});
          }}
        >
          Discard
        </Button>
        <PendingButton type="submit" disabled={!dirty} pending={update.isPending} pendingLabel="Saving…">
          Save changes
        </PendingButton>
      </StickyBar>
    </Form>
  );
}

function AccessCard() {
  const me = useMe();
  const user = me.data!.data;
  const [all, setAll] = useState(false);
  const permissions = permissionsOf(user).sort();
  const shown = all ? permissions : permissions.slice(0, 12);
  return (
    <SettingCard
      title="Role and access"
      caption="Set by a super admin; you cannot change your own access"
    >
      <SettingRow
        label="Role"
        description="What your account is allowed to do in this portal."
      >
        <SettingPills>
          {user.roles.map((role) => (
            <Badge key={role.id}>
              {role.name === "admin" ? "Administrator" : role.name}
            </Badge>
          ))}
        </SettingPills>
      </SettingRow>
      <SettingRow
        label={`Permissions (${permissions.length})`}
        description="Actions you can perform, granted through your role."
      >
        {permissions.length === 0 ? (
          <span>None</span>
        ) : (
          <SettingPills>
            {shown.map((name) => (
              <Badge key={name}>{name}</Badge>
            ))}
            {permissions.length > 12 && (
              <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>
                {all ? "Show fewer" : `Show all ${permissions.length}`}
              </Button>
            )}
          </SettingPills>
        )}
      </SettingRow>
    </SettingCard>
  );
}

function SecurityCard({
  email,
  lastLoginAt,
  format,
}: {
  email: string;
  lastLoginAt?: string | null;
  format: Intl.DateTimeFormat;
}) {
  const [changing, setChanging] = useState(false);
  return (
    <SettingCard title="Sign-in and security" caption="Protect your account">
      <SettingRow
        label="Last sign-in"
        description="The most recent successful sign-in to your account."
      >
        <span>
          {lastLoginAt
            ? format.format(new Date(lastLoginAt))
            : "No sign-in recorded"}
        </span>
      </SettingRow>
      <SettingRow
        label="Password"
        description="Changing your password signs you out everywhere."
      >
        <Button variant="outline" onClick={() => setChanging(true)}>
          Change password
        </Button>
      </SettingRow>
      <ChangePasswordDialog
        email={email}
        open={changing}
        onClose={() => setChanging(false)}
      />
    </SettingCard>
  );
}

function DevicesCard({ format }: { format: Intl.DateTimeFormat }) {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const logout = useLogout();
  const list = sessions.data?.data ?? [];
  return (
    <SettingCard
      title="Signed-in devices"
      caption="Each browser you are signed in on. Sign out any you do not recognise."
    >
      {sessions.isPending ? (
        <ListSkeleton label="Loading devices" />
      ) : sessions.isError ? (
        <PanelMessage onRetry={() => void sessions.refetch()}>Unable to load your devices.</PanelMessage>
      ) : (
        list.map((session) => (
          <SettingRow
            key={session.jti}
            label={describeDevice(session.userAgent)}
            description={`Signed in ${format.format(new Date(session.createdAt))} · expires ${format.format(new Date(session.expiresAt))}`}
          >
            {session.isCurrent && <Badge>This device</Badge>}
            <PendingButton
              variant="outline"
              size="sm"
              pending={
                revoke.isPending && revoke.variables?.jti === session.jti
              }
              pendingLabel="Signing out…"
              onClick={() => revoke.mutate(session)}
            >
              Sign out
            </PendingButton>
          </SettingRow>
        ))
      )}
      <FormError
        message={revoke.isError || revokeOthers.isError ? "Could not sign out. Try again." : undefined}
        className="my-3"
      />
      <SettingRow
        label="Other devices"
        description="Keeps this device signed in and ends every other session."
      >
        <PendingButton
          variant="outline"
          disabled={list.length < 2}
          pending={revokeOthers.isPending}
          pendingLabel="Signing out…"
          onClick={() => revokeOthers.mutate()}
        >
          Sign out of all other devices
        </PendingButton>
      </SettingRow>
      <SettingRow
        label="This session"
        description="Ends your session on this device."
      >
        <PendingButton pending={logout.isPending} pendingLabel="Signing out…" onClick={() => logout.mutate()}>
          Log out
        </PendingButton>
      </SettingRow>
    </SettingCard>
  );
}

function ActivityCard({ format }: { format: Intl.DateTimeFormat }) {
  const activity = useActivity();
  const events = activity.data?.data ?? [];
  return (
    <SettingCard
      title="Recent activity"
      caption="Your latest sign-ins and security events"
    >
      {activity.isPending ? (
        <ListSkeleton label="Loading activity" />
      ) : activity.isError ? (
        <PanelMessage onRetry={() => void activity.refetch()}>Unable to load your activity.</PanelMessage>
      ) : events.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        events.map((event) => (
          <SettingRow
            key={event.id}
            label={ACTIVITY_LABELS[event.action] ?? event.action}
            description={[
              format.format(new Date(event.createdAt)),
              describeDevice(event.userAgent),
              event.ipAddress,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {WARNING_ACTIONS.has(event.action) && (
              <StatusBadge status="pending">Review</StatusBadge>
            )}
          </SettingRow>
        ))
      )}
    </SettingCard>
  );
}
