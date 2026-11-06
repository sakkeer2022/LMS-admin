/** A calendar date as `YYYY-MM-DD`, with no time zone. Null for an impossible date. */
export function parseCalendarDate(
  value: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const check = new Date(Date.UTC(year, month - 1, day));
  const valid =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  return valid ? { year, month, day } : null;
}

/** Whole years completed on `on` by someone born on `dateOfBirth` (the same rule as the backend). */
export function completedYears(
  dateOfBirth: string,
  on: Date = new Date(),
): number | null {
  const born = parseCalendarDate(dateOfBirth);
  if (!born) return null;
  let years = on.getFullYear() - born.year;
  const monthDiff = on.getMonth() + 1 - born.month;
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < born.day)) years -= 1;
  return years;
}

const pad = (value: number): string => value.toString().padStart(2, "0");

/** `Date` (local calendar day) to `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` to a local-midnight `Date`, or undefined when it is not a real date. */
export function fromIsoDate(value: string): Date | undefined {
  const parsed = parseCalendarDate(value);
  return parsed
    ? new Date(parsed.year, parsed.month - 1, parsed.day)
    : undefined;
}

/** `YYYY-MM-DD` to the `dd / mm / yyyy` text shown in the field. */
export function formatDisplayDate(value: string): string {
  const parsed = parseCalendarDate(value);
  return parsed
    ? `${pad(parsed.day)} / ${pad(parsed.month)} / ${parsed.year}`
    : "";
}

/** Typed text (digits, with or without separators) to `YYYY-MM-DD`, or "" when it is not a complete real date. */
export function parseDisplayDate(text: string): string {
  const digits = text.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const iso = `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  return parseCalendarDate(iso) ? iso : "";
}

/** Digits typed so far, laid out as `dd / mm / yyyy` while the person types. */
export function maskDisplayDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
  ].filter(Boolean);
  return parts.join(" / ");
}
