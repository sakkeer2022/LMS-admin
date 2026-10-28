"use client";
import { forwardRef, type ComponentProps } from "react";
import { Button } from "./Button";

export const SubmitButton = forwardRef<
  HTMLButtonElement,
  Omit<ComponentProps<typeof Button>, "type">
>(function SubmitButton({ variant = "primary", ...props }, ref) {
  return <Button {...props} ref={ref} variant={variant} type="submit" />;
});
