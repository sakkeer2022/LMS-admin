const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365],
  ["month", 30],
  ["day", 1],
];

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso),
  );

/** "3 days ago", "last month", "today": the date's distance from now, for a quick read beside the exact date. */
export function relativeDate(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const [unit, size] =
    UNITS.find(([, size]) => Math.abs(days) >= size) ?? UNITS[UNITS.length - 1];
  return format.format(Math.trunc(days / size), unit);
}
