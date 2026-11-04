import { Skeleton } from "@/components/shadcn/skeleton";

/** Placeholder while a client page that reads the URL suspends. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
