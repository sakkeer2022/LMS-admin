import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { FacultyPage } from "@/features/faculty/components/faculty-page";

// Faculty (screens 27 and 27b, LMS-78, LMS-86). The page reads its filters from the URL (useSearchParams).
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <FacultyPage />
    </Suspense>
  );
}
