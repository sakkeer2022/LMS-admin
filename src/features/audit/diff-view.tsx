import { cn } from "@/lib/utils";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isList = (v: unknown): v is unknown[] =>
  Array.isArray(v) && v.every((x) => typeof x !== "object" || x === null);
const show = (v: unknown) =>
  v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
const WRAP = "[overflow-wrap:anywhere]";

function Chips({
  items,
  tone,
}: {
  items: string[];
  tone: "added" | "removed";
}) {
  return (
    <ul className="flex flex-wrap gap-1">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "rounded-pill px-2 py-0.5 font-mono text-xs",
            WRAP,
            tone === "added"
              ? "bg-success-subtle text-success-foreground"
              : "bg-error-subtle text-error-foreground",
          )}
        >
          {tone === "added" ? "+ " : "− "}
          {item}
        </li>
      ))}
    </ul>
  );
}

/** What changed, key by key: removed values in red, new values in green. Lists show only what was added or removed. */
export function DiffView({
  before,
  after,
}: {
  before?: unknown;
  after?: unknown;
}) {
  const a = isRecord(before)
    ? before
    : before === undefined
      ? {}
      : { value: before };
  const b = isRecord(after)
    ? after
    : after === undefined
      ? {}
      : { value: after };
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  if (keys.length === 0)
    return (
      <p className="text-sm text-text-secondary">
        No values were recorded for this entry.
      </p>
    );
  return (
    <div
      role="table"
      aria-label="Before and after"
      className="overflow-hidden rounded-md border text-sm"
    >
      {keys.map((key) => {
        const x = a[key];
        const y = b[key];
        const lists =
          (x === undefined || isList(x)) &&
          (y === undefined || isList(y)) &&
          (isList(x) || isList(y));
        return (
          <div
            role="row"
            key={key}
            className="grid grid-cols-1 gap-2 border-t border-border-subtle p-3 first:border-t-0 sm:grid-cols-[7rem_1fr]"
          >
            <span
              role="rowheader"
              className="font-mono text-xs text-text-secondary"
            >
              {key}
            </span>
            {lists ? (
              (() => {
                const was = ((x as unknown[]) ?? []).map(String);
                const now = ((y as unknown[]) ?? []).map(String);
                const removed = was.filter((v) => !now.includes(v));
                const added = now.filter((v) => !was.includes(v));
                const kept = now.length - added.length;
                return (
                  <div role="cell" className="flex flex-col gap-2">
                    {added.length > 0 && <Chips items={added} tone="added" />}
                    {removed.length > 0 && (
                      <Chips items={removed} tone="removed" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {added.length + removed.length === 0 ? "No change. " : ""}
                      {kept} unchanged
                    </span>
                  </div>
                );
              })()
            ) : (
              <div role="cell" className="grid grid-cols-2 gap-2">
                {[show(x), show(y)].map((value, i) => {
                  const changed = show(x) !== show(y);
                  return (
                    <span
                      key={i}
                      className={cn(
                        "rounded-md px-2 py-1 font-mono text-xs",
                        WRAP,
                        changed
                          ? i === 0
                            ? "bg-error-subtle text-error-foreground"
                            : "bg-success-subtle text-success-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <span className="sr-only">
                        {i === 0 ? "Before: " : "After: "}
                      </span>
                      {value || "—"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
