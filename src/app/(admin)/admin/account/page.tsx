"use client";
import { Badge, Button, Card, Typography } from "@/components/ui";
import {
  useLogout,
  useMe,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from "@/features/auth/api/auth";

const when = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function Account() {
  const me = useMe();
  const sessions = useSessions();
  const logout = useLogout();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const list = sessions.data?.data ?? [];

  return (
    <>
      <Typography variant="h1">Account &amp; sessions</Typography>
      {me.isPending ? (
        <Typography role="status">Loading…</Typography>
      ) : me.isError ? (
        <Typography role="alert">Please sign in again.</Typography>
      ) : (
        <Typography>
          {me.data.data.fullName} · {me.data.data.email}
        </Typography>
      )}
      <Card variant="section" aria-labelledby="sessions-title">
        <Typography variant="h2" id="sessions-title">
          Signed-in devices
        </Typography>
        {sessions.isPending ? (
          <Typography role="status">Loading sessions…</Typography>
        ) : sessions.isError ? (
          <Typography role="alert">Unable to load your sessions.</Typography>
        ) : (
          <ul>
            {list.map((session) => (
              <li key={session.jti}>
                <Typography>
                  {session.userAgent ?? "Unknown device"}{" "}
                  {session.isCurrent && <Badge tone="accent">This device</Badge>}
                </Typography>
                <Typography variant="body2" tone="muted">
                  Signed in {when.format(new Date(session.createdAt))} · expires{" "}
                  {when.format(new Date(session.expiresAt))}
                </Typography>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke.mutate(session)}
                  pending={revoke.isPending && revoke.variables?.jti === session.jti}
                  pendingLabel="Signing out…"
                >
                  {session.isCurrent ? "Sign out" : "Sign out device"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {(revoke.isError || revokeOthers.isError) && (
          <Typography role="alert" tone="danger">
            Could not sign out. Try again.
          </Typography>
        )}
        <Button
          onClick={() => revokeOthers.mutate()}
          pending={revokeOthers.isPending}
          disabled={list.length < 2}
        >
          Sign out of all other devices
        </Button>
      </Card>
      <Button
        onClick={() => logout.mutate()}
        pending={logout.isPending}
        pendingLabel="Signing out…"
      >
        Sign out
      </Button>
    </>
  );
}
