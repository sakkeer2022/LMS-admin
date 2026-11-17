import { ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

/** Shown in place of a screen the signed-in admin has no permission for. The API denies it regardless. */
export function NoAccess({ permission }: { permission: string }) {
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this page"
      description={
        <>
          Ask a Super Admin to give your role the <code className="font-mono text-xs">{permission}</code> permission.
        </>
      }
    />
  );
}
