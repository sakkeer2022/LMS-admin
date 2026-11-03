import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Reports" />
      <EmptyState
        title="Not available yet"
        description="Financial reports appear here once the backend report endpoints are connected."
      />
    </>
  );
}
