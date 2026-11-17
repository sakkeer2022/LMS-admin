export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  resourceId: string | null;
  severity: "INFO" | "WARN" | "SECURITY" | "CRITICAL";
  traceId: string;
  createdAt: string;
  changes?: { before?: unknown; after?: unknown };
}
export interface AuditFilters {
  actorId: string;
  action: string;
  entity: string;
  /** activity: named actions plus failures (default); requests: the raw API request entries */
  view: "activity" | "requests";
  /** Calendar dates (UTC), yyyy-mm-dd */
  from: string;
  to: string;
}
export const NO_AUDIT_FILTERS: AuditFilters = {
  actorId: "",
  action: "",
  entity: "",
  view: "activity",
  from: "",
  to: "",
};
export const MAX_WINDOW_DAYS = 31;
const DAY = 86_400_000;

/** `to` is inclusive in the UI and exclusive in the API, so it is moved to the start of the next UTC day. */
export function auditParams(f: AuditFilters): Record<string, string> {
  return {
    ...(f.actorId && { actorId: f.actorId }),
    ...(f.action && { action: f.action }),
    ...(f.entity && { entity: f.entity }),
    ...(f.view === "requests" && { view: f.view }),
    ...(f.from && { from: `${f.from}T00:00:00.000Z` }),
    ...(f.to && {
      to: new Date(Date.parse(`${f.to}T00:00:00.000Z`) + DAY).toISOString(),
    }),
  };
}
export function windowError(f: AuditFilters): string | undefined {
  if (!f.from || !f.to) return undefined;
  const span = (Date.parse(f.to) - Date.parse(f.from)) / DAY;
  if (span < 0) return "The end date is before the start date.";
  if (span + 1 > MAX_WINDOW_DAYS)
    return `Pick at most ${MAX_WINDOW_DAYS} days.`;
  return undefined;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);
