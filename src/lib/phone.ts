/**
 * Phone numbers as two parts, a country (dialling code) and the national number, with one combined value
 * for forms and the API: "+91 9876543210". The countries come from the backend (GET /regions/countries);
 * nothing about a country is written here (amentorz-backend src/docs/REGIONS.md). Pure functions, unit-tested.
 */

export interface DialCountry {
  /** ISO 3166-1 alpha-2, e.g. "IN" */
  code: string;
  name: string;
  /** "+91" */
  dialCode: string;
}

export interface PhoneParts {
  /** ISO code of the chosen country, or "" when none matches */
  countryCode: string;
  /** "+91", or "" when none matches */
  dialCode: string;
  /** Digits after the dialling code, e.g. "9876543210" */
  nationalNumber: string;
}

/** Digits only, without spaces, dashes, brackets or dots. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** The served country whose dialling code starts the number; the longest code wins (+971 before +9). */
export function matchDialCountry<T extends DialCountry>(value: string, countries: readonly T[]): T | undefined {
  const compact = value.replace(/[\s\-().]/g, "").replace(/^00/, "+");
  if (!compact.startsWith("+")) return undefined;
  return [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length).find((c) => compact.startsWith(c.dialCode));
}

/**
 * Splits a stored or typed value ("+91 98765 43210", "+919876543210", "9876543210") into its parts. A value
 * without a known dialling code keeps the `fallback` country (or the first served one) and treats every
 * digit as the national number.
 */
export function splitPhone(value: string | null | undefined, countries: readonly DialCountry[], fallback?: string): PhoneParts {
  const text = (value ?? "").trim();
  const country = matchDialCountry(text, countries);
  if (country) {
    const compact = text.replace(/[\s\-().]/g, "").replace(/^00/, "+");
    return { countryCode: country.code, dialCode: country.dialCode, nationalNumber: digitsOf(compact.slice(country.dialCode.length)) };
  }
  const chosen = countries.find((c) => c.code === fallback) ?? countries[0];
  // "+44 …" from a country that is not served: keep what was typed after the plus as the number
  return { countryCode: chosen?.code ?? "", dialCode: chosen?.dialCode ?? "", nationalNumber: digitsOf(text) };
}

/** The combined value: "+91 9876543210", or "" when no number is typed. */
export function joinPhone(dialCode: string, nationalNumber: string): string {
  const digits = digitsOf(nationalNumber);
  if (!digits) return "";
  return dialCode ? `${dialCode} ${digits}` : `+${digits}`;
}

/** E.164 form of a combined value ("+919876543210"), as the backend stores it. */
export function toE164(value: string): string {
  return value.replace(/[\s\-().]/g, "").replace(/^00/, "+");
}

export const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

/** "🇮🇳"-free label for the country list: "India (+91)". Flags are drawn separately as SVG. */
export function countryOptionLabel(country: DialCountry): string {
  return `${country.name} (${country.dialCode})`;
}
