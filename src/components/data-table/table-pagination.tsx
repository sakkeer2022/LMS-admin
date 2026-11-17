import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

export const PAGE_SIZES = [10, 20, 50] as const;

/**
 * Footer of every server-paginated listing: the result range, rows per page (when `onLimit` is given),
 * "Page x of y" and Previous / Next.
 */
export function TablePagination({
  page,
  limit,
  total,
  noun,
  onPage,
  onLimit,
}: {
  page: number;
  limit: number;
  total: number;
  /** Plural noun for the count, e.g. "sessions" */
  noun: string;
  onPage: (page: number) => void;
  /** Shows the rows-per-page control; omit when the page size is fixed */
  onLimit?: (limit: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle px-5 py-3 sm:h-14 sm:flex-row sm:items-center sm:py-0">
      <p className="text-sm text-text-secondary tabular-nums sm:flex-1" role="status">
        Showing {first}–{last} of {total} {noun}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onLimit && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span id="rows-per-page">Rows per page</span>
            <Select
              value={String(limit)}
              onValueChange={(next) => onLimit(Number(next))}
            >
              <SelectTrigger
                size="sm"
                className="w-20 bg-card"
                aria-labelledby="rows-per-page"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="text-sm text-text-secondary tabular-nums">
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft aria-hidden /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={last >= total}
            onClick={() => onPage(page + 1)}
          >
            Next <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
