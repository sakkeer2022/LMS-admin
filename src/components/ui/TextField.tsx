"use client";
import { forwardRef, useId, type ComponentProps } from "react";
import { Input } from "./Input";

import { FieldFrame, fieldIds, type FieldContent } from "./FieldFrame";
export type TextFieldProps = ComponentProps<typeof Input> & FieldContent;
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      id: providedId,
      label,
      labelHidden,
      description,
      error,
      containerClassName,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    return (
      <FieldFrame
        {...{ id, label, labelHidden, description, error, containerClassName }}
        required={props.required}
      >
        <Input
          {...props}
          ref={ref}
          id={id}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={fieldIds(id, description, error, describedBy)}
        />
      </FieldFrame>
    );
  },
);
