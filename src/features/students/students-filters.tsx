import { Globe, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/forms/search-input";
import { FilterChip } from "@/components/feedback/filter-chip";
import { CONSENT_LABELS, type ConsentStatus } from "./types";

export type AgeGroup = "" | "true" | "false";

export interface FilterState {
  search: string;
  country: string;
  age: AgeGroup;
  consent: "" | ConsentStatus;
}

export const NO_FILTERS: FilterState = {
  search: "",
  country: "",
  age: "",
  consent: "",
};

const AGE_LABELS: Record<Exclude<AgeGroup, "">, string> = {
  true: "Minors",
  false: "Adults",
};

// Radix Select cannot hold an empty value, so "no filter" is this word and is mapped back to "" on change
const ALL = "all";

function FilterSelect({
  label,
  icon: Icon,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  icon: LucideIcon;
  allLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const active = value !== "";
  return (
    <Select
      value={value || ALL}
      onValueChange={(next) => onChange(next === ALL ? "" : next)}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          "w-full bg-card data-[size=default]:h-10",
          active && "border-primary bg-accent/40 font-medium",
          className,
        )}
      >
        <Icon aria-hidden className={cn(active && "text-primary!")} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Search, the three filters, and the active filters as removable chips. */
export function StudentsFilters({
  value,
  countries,
  onChange,
}: {
  value: FilterState;
  countries: { code: string; name: string }[];
  onChange: (next: FilterState) => void;
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const countryName =
    countries.find((item) => item.code === value.country)?.name ??
    value.country;
  const chips: { key: string; label: string; clear: Partial<FilterState> }[] = [
    ...(value.country
      ? [{ key: "country", label: countryName, clear: { country: "" } }]
      : []),
    ...(value.age
      ? [{ key: "age", label: AGE_LABELS[value.age], clear: { age: "" as AgeGroup } }]
      : []),
    ...(value.consent
      ? [
          {
            key: "consent",
            label: `Consent: ${CONSENT_LABELS[value.consent]}`,
            clear: { consent: "" as const },
          },
        ]
      : []),
  ];
  const active = chips.length > 0 || value.search !== "";

  return (
    <div className="flex flex-col gap-3 border-b border-border-subtle p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={value.search}
          onChange={(search) => set({ search })}
          label="Search students"
          placeholder="Search name, email or mobile"
          className="sm:w-72"
        />
        <FilterSelect
          label="Country"
          icon={Globe}
          allLabel="All countries"
          value={value.country}
          options={countries.map((item) => ({
            value: item.code,
            label: item.name,
          }))}
          onChange={(country) => set({ country })}
          className="sm:w-48"
        />
        <FilterSelect
          label="Age group"
          icon={Users}
          allLabel="All ages"
          value={value.age}
          options={[
            { value: "true", label: "Minors" },
            { value: "false", label: "Adults" },
          ]}
          onChange={(age) => set({ age: age as AgeGroup })}
          className="sm:w-40"
        />
        <FilterSelect
          label="Guardian consent"
          icon={ShieldCheck}
          allLabel="Any consent status"
          value={value.consent}
          options={(Object.keys(CONSENT_LABELS) as ConsentStatus[]).map((key) => ({
            value: key,
            label: CONSENT_LABELS[key],
          }))}
          onChange={(consent) => set({ consent: consent as "" | ConsentStatus })}
          className="sm:w-52"
        />
        {active && (
          <Button
            variant="ghost"
            className="text-text-secondary sm:ml-auto"
            onClick={() => onChange(NO_FILTERS)}
          >
            <X aria-hidden /> Clear filters
          </Button>
        )}
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              onRemove={() => set(chip.clear)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
