"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Form } from "@/components/ui/Form";
import {
  PageHeader,
  SettingButton,
  SettingCallout,
  SettingCard,
  SettingEmpty,
  SettingInput,
  SettingPill,
  SettingPills,
  SettingRow,
  SettingSelect,
  SettingsPage,
  StickyBar,
} from "@/components/ui/settings-layout";
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
import { describeDevice } from "@/lib/auth/device";
import { ChangePasswordDialog } from "./change-password-dialog";
import { ACTIVITY_LABELS, WARNING_ACTIONS } from "./labels";
import { profileSchema, type ProfileValues } from "./schema";

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

  if (me.isPending) return <p role="status">Loading your profile…</p>;
  if (me.isError || !user) return <p role="alert">Please sign in again.</p>;

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
      <SecurityCard lastLoginAt={user.lastLoginAt} format={format} />
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
      className="sp-form"
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
        >
          <SettingInput
            id="fullName"
            value={values.fullName}
            onChange={(e) => set("fullName")(e.target.value)}
            autoComplete="name"
            maxLength={150}
            required
            error={errors.fullName}
          />
        </SettingRow>
        <SettingRow
          label="Email address"
          htmlFor="email"
          description="Used to sign in. Changing it needs email verification, which arrives with account recovery."
        >
          <SettingInput id="email" value={user.email} readOnly />
          <SettingPill tone={user.emailVerified ? undefined : "warning"}>
            {user.emailVerified ? "Verified" : "Not verified"}
          </SettingPill>
        </SettingRow>
        <SettingRow
          label="Mobile number"
          htmlFor="mobileNumber"
          description="International format, including the country code. Optional."
        >
          <SettingInput
            id="mobileNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            value={values.mobileNumber ?? ""}
            onChange={(e) => set("mobileNumber")(e.target.value)}
            error={errors.mobileNumber}
          />
        </SettingRow>
        <SettingRow
          label="Time zone"
          htmlFor="timezone"
          description="Dates and times on this page are shown in this zone."
        >
          <SettingSelect
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
          </SettingSelect>
        </SettingRow>
        {errors.form && (
          <SettingCallout>
            <span role="alert">{errors.form}</span>
          </SettingCallout>
        )}
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
        <SettingButton
          variant="ghost"
          disabled={!dirty || update.isPending}
          onClick={() => {
            setValues(initial);
            setErrors({});
          }}
        >
          Discard
        </SettingButton>
        <SettingButton
          variant="primary"
          type="submit"
          disabled={!dirty}
          pending={update.isPending}
          pendingLabel="Saving…"
        >
          Save changes
        </SettingButton>
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
            <SettingPill key={role.id}>
              {role.name === "admin" ? "Administrator" : role.name}
            </SettingPill>
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
              <SettingPill key={name}>{name}</SettingPill>
            ))}
            {permissions.length > 12 && (
              <SettingButton
                variant="ghost"
                size="sm"
                onClick={() => setAll(!all)}
              >
                {all ? "Show fewer" : `Show all ${permissions.length}`}
              </SettingButton>
            )}
          </SettingPills>
        )}
      </SettingRow>
    </SettingCard>
  );
}

function SecurityCard({
  lastLoginAt,
  format,
}: {
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
        <SettingButton onClick={() => setChanging(true)}>
          Change password
        </SettingButton>
      </SettingRow>
      <ChangePasswordDialog
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
        <SettingEmpty>Loading devices…</SettingEmpty>
      ) : sessions.isError ? (
        <SettingEmpty>Unable to load your devices.</SettingEmpty>
      ) : (
        list.map((session) => (
          <SettingRow
            key={session.jti}
            label={describeDevice(session.userAgent)}
            description={`Signed in ${format.format(new Date(session.createdAt))} · expires ${format.format(new Date(session.expiresAt))}`}
          >
            {session.isCurrent && <SettingPill>This device</SettingPill>}
            <SettingButton
              size="sm"
              pending={
                revoke.isPending && revoke.variables?.jti === session.jti
              }
              pendingLabel="Signing out…"
              onClick={() => revoke.mutate(session)}
            >
              Sign out
            </SettingButton>
          </SettingRow>
        ))
      )}
      {(revoke.isError || revokeOthers.isError) && (
        <SettingCallout>
          <span role="alert">Could not sign out. Try again.</span>
        </SettingCallout>
      )}
      <SettingRow
        label="Other devices"
        description="Keeps this device signed in and ends every other session."
      >
        <SettingButton
          disabled={list.length < 2}
          pending={revokeOthers.isPending}
          pendingLabel="Signing out…"
          onClick={() => revokeOthers.mutate()}
        >
          Sign out of all other devices
        </SettingButton>
      </SettingRow>
      <SettingRow
        label="This session"
        description="Ends your session on this device."
      >
        <SettingButton
          variant="primary"
          pending={logout.isPending}
          pendingLabel="Signing out…"
          onClick={() => logout.mutate()}
        >
          Log out
        </SettingButton>
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
        <SettingEmpty>Loading activity…</SettingEmpty>
      ) : activity.isError ? (
        <SettingEmpty>Unable to load your activity.</SettingEmpty>
      ) : events.length === 0 ? (
        <SettingEmpty>No activity yet.</SettingEmpty>
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
              <SettingPill tone="warning">Review</SettingPill>
            )}
          </SettingRow>
        ))
      )}
    </SettingCard>
  );
}
