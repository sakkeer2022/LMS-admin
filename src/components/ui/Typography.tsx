import type { ComponentPropsWithRef, ElementType, ReactNode } from "react";
import { cx } from "./utils";

/*
 * Centralized, MUI-inspired typography.
 *
 * - `variant` controls the visual style (font size, weight, line height).
 * - `component` overrides the rendered element without changing the style.
 * - `tone` applies a semantic text colour from the active theme.
 *
 * Visual tokens live in ui.css (`--typography-*`). This module is a plain
 * (server-compatible) component: it holds no state and needs no "use client".
 */

/** Default semantic element for each variant. */
const variantElements = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "p",
  subtitle2: "p",
  body1: "p",
  body2: "p",
  caption: "span",
  overline: "span",
  inherit: "p",
} as const satisfies Record<string, ElementType>;

type VariantElementMap = typeof variantElements;

export type TypographyVariant = keyof VariantElementMap;
export type TypographyTone =
  | "default"
  | "muted"
  | "danger"
  | "success"
  | "warning";

/** Element rendered for a variant when no `component` is supplied. */
export type TypographyDefaultElement<V extends TypographyVariant> =
  VariantElementMap[V];

type TypographyOwnProps<V extends TypographyVariant, C extends ElementType> = {
  /** Visual style. Defaults to `body1`. */
  variant?: V;
  /** Rendered element or component; independent of `variant`. */
  component?: C;
  /** Semantic colour. `default` inherits the surrounding text colour. */
  tone?: TypographyTone;
  className?: string;
  children?: ReactNode;
};

/**
 * Props are typed against the rendered element: `variant="h2"` accepts
 * heading attributes and `ref: Ref<HTMLHeadingElement>`, while
 * `component="label"` accepts `htmlFor` and `ref: Ref<HTMLLabelElement>`.
 */
export type TypographyProps<
  V extends TypographyVariant = "body1",
  C extends ElementType = TypographyDefaultElement<V>,
> = TypographyOwnProps<V, C> &
  Omit<ComponentPropsWithRef<C>, keyof TypographyOwnProps<V, C>>;

function typographyClassName(
  variant: TypographyVariant,
  tone: TypographyTone,
  className?: string,
) {
  return cx(
    "ui-typography",
    `ui-typography--${variant}`,
    tone !== "default" && `ui-typography--${tone}`,
    className,
  );
}

export function Typography<
  V extends TypographyVariant = "body1",
  C extends ElementType = TypographyDefaultElement<V>,
>({
  variant,
  component,
  tone = "default",
  className,
  ...props
}: TypographyProps<V, C>) {
  const resolved: TypographyVariant = variant ?? "body1";
  const Component: ElementType = component ?? variantElements[resolved];
  return (
    <Component
      {...props}
      className={typographyClassName(resolved, tone, className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Backwards-compatible aliases. Prefer <Typography> in new code.      */
/* ------------------------------------------------------------------ */

type HeadingLevel = 1 | 2 | 3;

/** @deprecated Use `<Typography variant="h1" | "h2" | "h3">`. */
export function Heading({
  level = 1,
  ...props
}: ComponentPropsWithRef<"h1"> & { level?: HeadingLevel }) {
  const variant = `h${level}` as const;
  return <Typography<typeof variant> {...props} variant={variant} />;
}

/** @deprecated Use `<Typography variant="body1" | "body2" | …>`. */
export function Text({
  tone = "default",
  ...props
}: ComponentPropsWithRef<"p"> & {
  tone?: Extract<TypographyTone, "default" | "muted" | "danger">;
}) {
  return <Typography {...props} variant="inherit" component="p" tone={tone} />;
}
