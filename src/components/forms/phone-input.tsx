"use client";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { countryOptionLabel, joinPhone, splitPhone, type DialCountry, type PhoneParts } from "@/lib/phone";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;
let flagsModule: Promise<Record<string, FlagComponent>> | undefined;

/** SVG flags load once, on demand, in their own chunk (emoji flags do not render on Windows). */
function loadFlags(): Promise<Record<string, FlagComponent>> {
  flagsModule ??= import("country-flag-icons/react/3x2").then((m) => m as unknown as Record<string, FlagComponent>);
  return flagsModule;
}

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const [Flag, setFlag] = useState<FlagComponent | undefined>();
  useEffect(() => {
    let live = true;
    if (!code) return;
    void loadFlags()
      .then((flags) => {
        if (live) setFlag(() => flags[code.toUpperCase()]);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [code]);
  return (
    <span aria-hidden className={cn("inline-flex h-3.5 w-5 flex-none overflow-hidden rounded-[2px] bg-muted shadow-[0_0_0_1px_rgba(0,0,0,0.08)]", className)}>
      {Flag ? <Flag className="h-full w-full" /> : <span className="m-auto text-[8px] leading-none font-semibold text-muted-foreground">{code}</span>}
    </span>
  );
}

export interface PhoneInputProps {
  id: string;
  /** Submitted with forms read through FormData: the combined value "+91 9876543210" */
  name?: string;
  /** Combined value ("+91 9876543210" or "+919876543210"). Leave undefined to use defaultValue. */
  value?: string;
  defaultValue?: string;
  /** Receives the combined value and its parts (country, dialling code, national number) */
  onChange?: (value: string, parts: PhoneParts) => void;
  /** Served countries (GET /regions/countries) */
  countries: readonly DialCountry[];
  /** ISO code shown first when the value has no dialling code */
  defaultCountry?: string;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  autoComplete?: string;
  /** Height and other classes of the outer box, to match the surrounding inputs */
  className?: string;
}

/**
 * A phone number as two controls in one box: the country (flag and dialling code, a native select so it
 * works with keyboards, screen readers and mobile pickers) and the national number. The combined value
 * keeps the format the forms already used ("+91 9876543210"); `onChange` also gives the parts separately.
 */
export function PhoneInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  countries,
  defaultCountry,
  invalid,
  describedBy,
  required,
  disabled,
  readOnly,
  placeholder,
  autoComplete = "tel-national",
  className,
}: PhoneInputProps) {
  const controlled = value !== undefined;
  const [innerValue, setInnerValue] = useState(defaultValue ?? "");
  // The chosen country is kept apart: an empty number has no dialling code to read it from
  const [country, setCountry] = useState(() => splitPhone(defaultValue, countries, defaultCountry).countryCode);
  const parts = splitPhone(controlled ? value : innerValue, countries, country || defaultCountry);
  const selected = countries.find((c) => c.code === parts.countryCode);

  function emit(next: PhoneParts) {
    const combined = joinPhone(next.dialCode, next.nationalNumber);
    setCountry(next.countryCode);
    if (!controlled) setInnerValue(combined);
    onChange?.(combined, next);
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full min-w-0 items-stretch rounded-md border border-input bg-card text-sm shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        invalid && "border-destructive ring-destructive/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="relative flex flex-none items-center gap-1.5 border-r border-input pr-2 pl-3">
        <CountryFlag code={parts.countryCode} />
        <span className="tabular-nums">{selected?.dialCode ?? "+"}</span>
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        <select
          id={`${id}-country`}
          aria-label="Country code"
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          value={parts.countryCode}
          disabled={disabled || readOnly || countries.length === 0}
          onChange={(event) => {
            const next = countries.find((c) => c.code === event.target.value);
            emit({ countryCode: next?.code ?? "", dialCode: next?.dialCode ?? "", nationalNumber: parts.nationalNumber });
          }}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {countryOptionLabel(c)}
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        className="min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        value={parts.nationalNumber}
        placeholder={placeholder ?? "98765 43210"}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => emit({ ...parts, nationalNumber: event.target.value.replace(/[^\d\s-]/g, "").replace(/[\s-]/g, "") })}
        onPaste={(event) => {
          // A pasted full number ("+971 50 123 4567") also picks its country
          const text = event.clipboardData.getData("text");
          if (/^\s*(\+|00)/.test(text)) {
            event.preventDefault();
            emit(splitPhone(text, countries, parts.countryCode));
          }
        }}
      />
      {name && <input type="hidden" name={name} value={joinPhone(parts.dialCode, parts.nationalNumber)} />}
    </div>
  );
}
