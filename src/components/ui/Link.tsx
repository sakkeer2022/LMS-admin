"use client";
import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { buttonClass, type ButtonStyle } from './button-style';
import { cx } from './utils';
export const ButtonLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NextLink> & ButtonStyle
>(function ButtonLink({ variant, size, className, ...props }, ref) {
  return (
    <Link
      {...props}
      ref={ref}
      className={cx(buttonClass({ variant, size }), className)}
    />
  );
});

/** Keep application navigation on Next's router; external URLs use native anchors. */
export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(
  function Link({ href, target, rel, ...props }, ref) {
    const safeRel = target === '_blank' ? `${rel ?? ''} noopener noreferrer`.trim() : rel;
    if (typeof href === 'string' && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) {
      return <a {...props} href={href} ref={ref} target={target} rel={safeRel} />;
    }
    return <NextLink {...props} href={href} ref={ref} target={target} rel={safeRel} />;
  },
);
