"use client";
import { forwardRef, useId, type ComponentProps } from "react";
import { Select } from "./Select";

import { FieldFrame, fieldIds, type FieldContent } from "./FieldFrame";
export const SelectField = forwardRef<
  HTMLSelectElement,
  ComponentProps<typeof Select> & FieldContent
>(function SelectField(
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
      <Select
        {...props}
        ref={ref}
        id={id}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={fieldIds(id, description, error, describedBy)}
      />
    </FieldFrame>
  );
});
