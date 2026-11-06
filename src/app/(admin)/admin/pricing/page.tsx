import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PricingPage } from "@/features/pricing/components/pricing-page";

// Pricing (screen 29, LMS-58, LMS-59). The page reads its filters from the URL (useSearchParams).
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <PricingPage />
    </Suspense>
  );
}
