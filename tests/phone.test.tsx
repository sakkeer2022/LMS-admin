import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { E164_PATTERN, countryOptionLabel, joinPhone, matchDialCountry, splitPhone, toE164 } from "@/lib/phone";
import { PhoneInput } from "@/components/forms/phone-input";

// Served countries as GET /regions/countries returns them (the app hard-codes none)
const countries = [
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
];

describe("phone parts", () => {
  it.each([
    ["+91 9876543210", "IN", "+91", "9876543210"],
    ["+919876543210", "IN", "+91", "9876543210"],
    ["+91-98765 43210", "IN", "+91", "9876543210"],
    ["+971 50 123 4567", "AE", "+971", "501234567"],
    ["00971501234567", "AE", "+971", "501234567"],
  ])("splits %s", (value, countryCode, dialCode, nationalNumber) => {
    expect(splitPhone(value, countries)).toEqual({ countryCode, dialCode, nationalNumber });
  });

  it("keeps the chosen country when the value has no dialling code", () => {
    expect(splitPhone("", countries, "AE")).toEqual({ countryCode: "AE", dialCode: "+971", nationalNumber: "" });
    expect(splitPhone("98765 43210", countries)).toEqual({ countryCode: "IN", dialCode: "+91", nationalNumber: "9876543210" });
    expect(splitPhone(null, [], undefined)).toEqual({ countryCode: "", dialCode: "", nationalNumber: "" });
  });

  it("joins to the format the forms already sent, with a space after the code", () => {
    expect(joinPhone("+91", "98765 43210")).toBe("+91 9876543210");
    expect(joinPhone("+971", "")).toBe("");
    expect(joinPhone("", "4420")).toBe("+4420");
    expect(toE164("+91 98765 43210")).toBe("+919876543210");
    expect(E164_PATTERN.test(toE164(joinPhone("+971", "501234567")))).toBe(true);
  });

  it("matches the longest dialling code first", () => {
    const withShort = [...countries, { code: "XX", name: "Short", dialCode: "+9" }];
    expect(matchDialCountry("+971501234567", withShort)?.code).toBe("AE");
    expect(matchDialCountry("9876543210", withShort)).toBeUndefined();
    expect(countryOptionLabel(countries[0]!)).toBe("India (+91)");
  });
});

describe("PhoneInput", () => {
  it("renders a country picker and a number box, and submits the combined value", () => {
    const html = renderToStaticMarkup(<PhoneInput id="phone" name="mobileNumber" value="+971 501234567" countries={countries} invalid describedBy="phone-error" />);
    expect(html).toContain('aria-label="Country code"');
    expect(html).toContain("United Arab Emirates (+971)");
    expect(html).toContain('value="501234567"');
    expect(html).toContain('type="hidden" name="mobileNumber" value="+971 501234567"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="phone-error"');
  });

  it("starts on the default country with an empty number", () => {
    const html = renderToStaticMarkup(<PhoneInput id="p" name="m" defaultValue="" countries={countries} defaultCountry="AE" />);
    expect(html).toContain("+971");
    expect(html).toContain('name="m" value=""');
  });
});
