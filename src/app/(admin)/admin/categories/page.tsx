import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { CategoryTreePage } from "@/features/category-tree/components/category-tree-page";

// Categories & content (screen 28, ADR-0005). The page reads its filters from the URL (useSearchParams).
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <CategoryTreePage />
    </Suspense>
  );
}
