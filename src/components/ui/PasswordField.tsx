"use client";
import { forwardRef, useId, useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";

import { FieldFrame, fieldIds } from "./FieldFrame";
import type { TextFieldProps } from "./TextField";
export const PasswordField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, "type"> & { allowReveal?: boolean }
>(function PasswordField(
  {
    id: providedId,
    label,
    labelHidden,
    description,
    error,
    containerClassName,
    allowReveal = true,
    "aria-describedby": describedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldFrame
      {...{ id, label, labelHidden, description, error, containerClassName }}
      required={props.required}
    >
      <div className="ui-password">
        <Input
          {...props}
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={fieldIds(id, description, error, describedBy)}
        />
        {allowReveal && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-controls={id}
            aria-pressed={visible}
            disabled={props.disabled}
            onClick={() => setVisible(!visible)}
          >
            {visible ? "Hide" : "Show"}
          </Button>
        )}
      </div>
    </FieldFrame>
  );
});
