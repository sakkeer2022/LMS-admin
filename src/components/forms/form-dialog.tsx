"use client";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";

/**
 * A dialog that holds a form: title, description, the form, and the actions in a footer. While `busy` it
 * cannot be closed (Esc, a click outside and the close button are off), so a request is never abandoned half way.
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  footer,
  busy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  /** The actions; a submit button here can point at the form with `form="id"` */
  footer?: ReactNode;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!busy}
        onInteractOutside={(event) => busy && event.preventDefault()}
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
