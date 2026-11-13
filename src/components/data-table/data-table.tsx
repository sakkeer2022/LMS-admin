"use client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { Skeleton } from "@/components/shadcn/skeleton";
import { cn } from "@/lib/utils";

/**
 * Column meta. `align: "right"` right-aligns numeric columns. `mobile` says what the column becomes in the
 * phone card list: the card's `title` (default: the first column), the corner `action` (default: a column
 * whose header is not text, such as the row menu), or `hide`. Every other column becomes a label and value.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "right";
    className?: string;
    mobile?: "title" | "action" | "hide";
    /** Leaves the field off a row's card when it has nothing to show, so cards do not fill with dashes */
    mobileHideWhen?: (row: TData) => boolean;
  }
}

type Role = "title" | "action" | "hide" | "field";

/**
 * The one listing component. From `md` it is a table; below `md` the same rows are a list of tappable cards,
 * so a listing needs no phone layout of its own. Spacing is the standard for every listing: 20px at both ends
 * of a row, 64px rows, a 40px header band.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  caption,
  loading = false,
  loadingRows = 6,
  empty,
  getRowId,
  onRowClick,
  canClickRow,
  isRowSelected,
  renderCard,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Accessible table name, not shown */
  caption: string;
  loading?: boolean;
  loadingRows?: number;
  /** Shown instead of rows when `data` is empty */
  empty?: ReactNode;
  getRowId?: (row: TData) => string;
  /** Makes a row clickable (pointer cursor, hover); put real buttons or links inside it too, for the keyboard */
  onRowClick?: (row: TData) => void;
  /** Which rows are clickable when only some are */
  canClickRow?: (row: TData) => boolean;
  /** Highlights the row whose detail is open */
  isRowSelected?: (row: TData) => boolean;
  /** Replaces the generated phone card for a row, when the generated one does not read well */
  renderCard?: (row: TData) => ReactNode;
}) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });
  const columnCount = columns.length;
  const rows = table.getRowModel().rows;
  const leaves = table.getAllLeafColumns();

  // Which column plays which part in a card
  const roles: Record<string, Role> = {};
  leaves.forEach((column, index) => {
    const meta = column.columnDef.meta?.mobile;
    const textHeader = typeof column.columnDef.header === "string";
    roles[column.id] =
      meta ?? (index === 0 ? "title" : !textHeader ? "action" : "field");
  });
  // An explicit title elsewhere wins over the first column
  const explicitTitle = leaves.find(
    (c) => c.columnDef.meta?.mobile === "title",
  );
  if (explicitTitle)
    leaves.forEach((c) => {
      if (c.id !== explicitTitle.id && roles[c.id] === "title")
        roles[c.id] = "field";
    });

  const cellOf = (row: Row<TData>, id: string) => {
    const cell = row.getVisibleCells().find((c) => c.column.id === id);
    return cell
      ? flexRender(cell.column.columnDef.cell, cell.getContext())
      : null;
  };
  const headerText = (id: string) => {
    const header = leaves.find((c) => c.id === id)?.columnDef.header;
    return typeof header === "string" ? header : id;
  };
  const clickableOf = (row: TData) =>
    Boolean(onRowClick && (canClickRow?.(row) ?? true));

  return (
    <>
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 border-b border-border-subtle bg-accent/30 px-5 py-2 text-xs font-medium text-accent-foreground"
        >
          <Loader2
            aria-hidden
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
          Loading…
        </p>
      )}

      {/* From md: the table */}
      <Table className="hidden md:table [&_tr>:first-child]:pl-5 [&_tr>:last-child]:pr-5">
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow
              key={group.id}
              className="bg-sunken/60 hover:bg-sunken/60 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-text-secondary [&_th]:uppercase"
            >
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    header.column.columnDef.meta?.align === "right" &&
                      "text-right",
                    header.column.columnDef.meta?.className,
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: loadingRows }, (_, row) => (
              <TableRow key={row} className="h-16 hover:bg-transparent">
                {Array.from({ length: columnCount }, (_, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => {
              const clickable = clickableOf(row.original);
              return (
                <TableRow
                  key={row.id}
                  data-state={
                    isRowSelected?.(row.original) ? "selected" : undefined
                  }
                  className={cn(
                    "h-16 duration-300 motion-safe:animate-in motion-safe:fade-in-0",
                    clickable && "cursor-pointer hover:bg-accent/40",
                  )}
                  onClick={
                    clickable ? () => onRowClick!(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.align === "right" &&
                          "text-right",
                        cell.column.columnDef.meta?.className,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className="h-32 text-center text-muted-foreground"
              >
                <span className="flex flex-col items-center gap-2">
                  <Inbox
                    aria-hidden
                    className="size-6 text-muted-foreground/70"
                  />
                  {empty ?? "No results."}
                </span>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Below md: the same rows as cards */}
      <ul className="flex flex-col divide-y divide-border-subtle md:hidden">
        {loading ? (
          Array.from({ length: Math.min(loadingRows, 5) }, (_, row) => (
            <li key={row} className="flex items-center gap-3 p-4">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </li>
          ))
        ) : rows.length ? (
          rows.map((row) => {
            const clickable = clickableOf(row.original);
            const title = leaves.find((c) => roles[c.id] === "title");
            const action = leaves.find((c) => roles[c.id] === "action");
            const fields = leaves.filter(
              (c) =>
                roles[c.id] === "field" &&
                !c.columnDef.meta?.mobileHideWhen?.(row.original),
            );
            return (
              <li
                key={row.id}
                data-selected={isRowSelected?.(row.original) || undefined}
                className={cn(
                  "flex flex-col gap-3 p-4 transition-colors duration-300 data-[selected=true]:bg-accent motion-safe:animate-in motion-safe:fade-in-0 motion-reduce:transition-none",
                  clickable && "cursor-pointer hover:bg-accent/40",
                )}
                onClick={
                  clickable ? () => onRowClick!(row.original) : undefined
                }
              >
                {renderCard ? (
                  renderCard(row.original)
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {title && cellOf(row, title.id)}
                      </div>
                      {action && (
                        <div
                          className="shrink-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {cellOf(row, action.id)}
                        </div>
                      )}
                    </div>
                    {fields.length > 0 && (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {fields.map((column) => (
                          <div
                            key={column.id}
                            className="flex min-w-0 flex-col gap-0.5"
                          >
                            <dt className="text-xs text-muted-foreground">
                              {headerText(column.id)}
                            </dt>
                            <dd className="min-w-0 break-words">
                              {cellOf(row, column.id)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </>
                )}
              </li>
            );
          })
        ) : (
          <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <Inbox aria-hidden className="size-6 text-muted-foreground/70" />
            {empty ?? "No results."}
          </li>
        )}
      </ul>
    </>
  );
}
