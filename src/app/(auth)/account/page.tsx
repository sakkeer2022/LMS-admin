"use client";
import { Button, Typography } from "@/components/ui";
import { useMe, useLogout } from "@/features/auth/api/auth";
export default function Account() {
  const me = useMe();
  const logout = useLogout();
  return (
    <>
      <Typography variant="h1">Account</Typography>
      {me.isPending ? (
        <Typography role="status">Loading…</Typography>
      ) : me.isError ? (
        <Typography role="alert">Please sign in again.</Typography>
      ) : (
        <Typography>
          {me.data.data.firstName} · {me.data.data.email}
        </Typography>
      )}
      <Typography>
        Use an administrator-provided tenant portal link. Portal roles and
        tenant membership are provisioned by your backend.
      </Typography>
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
