import { Button } from "@/components/shadcn/button";

/** Footer for a server-paginated table: result count and Previous / Next. */
export function TablePagination({
  page,
  limit,
  total,
  noun,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  /** Plural noun for the count, e.g. "sessions" */
  noun: string;
  onPage: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <div className="flex h-14 items-center gap-2 border-t border-border-subtle px-4">
      <p className="flex-1 text-sm text-text-secondary" role="status">
        Showing {first}–{last} of {total} {noun}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={last >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
