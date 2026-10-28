export function cx(...values: (string | undefined | false)[]) {
  return values.filter(Boolean).join(" ");
}
