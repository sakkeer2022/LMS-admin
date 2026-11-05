"use client";
import { SelectField } from "@/components/forms/field";
import type { PickerOffering } from "@/lib/api/offering-tree";

export interface OfferingChoice {
  categoryId: string;
  curriculumId: string;
}
export const emptyChoice: OfferingChoice = { categoryId: "", curriculumId: "" };

/** The offering a complete choice stands for, or undefined while incomplete. */
export function chosenOffering(offerings: readonly PickerOffering[], choice: OfferingChoice) {
  return offerings.find((o) => o.curriculumId === choice.curriculumId && o.categoryId === choice.categoryId);
}

/**
 * The category (a leaf of the category tree, shown with its path). Each leaf has one
 * offering, so choosing the category chooses the offering too.
 */
export function OfferingPicker({
  offerings,
  value,
  onChange,
  errors = {},
}: {
  offerings: readonly PickerOffering[];
  value: OfferingChoice;
  onChange: (next: OfferingChoice) => void;
  errors?: Partial<Record<keyof OfferingChoice, string>>;
}) {
  return (
    <SelectField
      label="Category"
      value={value.curriculumId}
      required
      error={errors.categoryId ?? errors.curriculumId}
      onChange={(e) => {
        const offering = offerings.find((o) => o.curriculumId === e.target.value);
        onChange(offering ? { categoryId: offering.categoryId, curriculumId: offering.curriculumId } : emptyChoice);
      }}
    >
      <option value="">Select category</option>
      {offerings.map((o) => (
        <option key={o.curriculumId} value={o.curriculumId}>
          {o.label}
        </option>
      ))}
    </SelectField>
  );
}
