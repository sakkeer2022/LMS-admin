import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Audit logs" />
      <EmptyState
        title="Not available yet"
        description="Audit logs appear here once the audit.read endpoint is connected."
      />
    </>
  );
}
