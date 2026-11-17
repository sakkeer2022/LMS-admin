import type { ComponentProps } from "react";

/** A form that disables every control inside it while `pending`, so nothing is edited or sent twice. */
export function Form({ pending, children, ...props }: ComponentProps<"form"> & { pending?: boolean }) {
  return (
    <form {...props} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
