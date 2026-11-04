"use client";
import { SelectField } from "@/components/forms/field";
import { pickerCategories, type PickerOffering } from "@/lib/api/offering-tree";

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
 * Category (the bookable leaf, shown with its path) → offering (subject · board · level).
 * Only combinations that exist in the category tree are offered; changing the category
 * clears the offering.
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
  const inCategory = offerings.filter((o) => o.categoryId === value.categoryId);
  return (
    <>
      <SelectField
        label="Category"
        value={value.categoryId}
        required
        error={errors.categoryId}
        onChange={(e) => onChange({ categoryId: e.target.value, curriculumId: "" })}
      >
        <option value="">Select category</option>
        {pickerCategories(offerings).map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Subject · Board · Level"
        value={value.curriculumId}
        required
        disabled={!value.categoryId}
        error={errors.curriculumId}
        onChange={(e) => onChange({ ...value, curriculumId: e.target.value })}
      >
        <option value="">Select offering</option>
        {inCategory.map((o) => (
          <option key={o.curriculumId} value={o.curriculumId}>
            {o.label}
          </option>
        ))}
      </SelectField>
    </>
  );
}
