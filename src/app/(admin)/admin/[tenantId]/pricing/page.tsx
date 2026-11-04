import { Suspense } from "react";
import { PanelSkeleton } from "@/components/ui/dashboard-ui";
import { PricingPage } from "@/features/pricing/components/pricing-page";
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  // The page reads its filters from the URL (useSearchParams)
  return (
    <Suspense fallback={<PanelSkeleton rows={8} />}>
      <PricingPage tenant={tenantId} />
    </Suspense>
  );
}
