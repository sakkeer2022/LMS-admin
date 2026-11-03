import { describe, expect, it } from "vitest";
import {
  newPasswordSchema,
  recoveryCodeSchema,
  recoveryEmailSchema,
} from "@/features/auth/schemas/recovery";

describe("recovery schemas", () => {
  it("normalises the email and rejects an invalid one", () => {
    expect(recoveryEmailSchema.parse({ email: " Aarav@Example.org " }).email).toBe("aarav@example.org");
    expect(recoveryEmailSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(recoveryEmailSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("accepts only a 6-digit code", () => {
    expect(recoveryCodeSchema.safeParse({ otp: "123456" }).success).toBe(true);
    for (const otp of ["12345", "1234567", "abcdef", "12 456", ""]) {
      expect(recoveryCodeSchema.safeParse({ otp }).success).toBe(false);
    }
  });

  it("applies the platform password rule and requires the confirmation to match", () => {
    const ok = { newPassword: "Brand-new-pass1", confirmPassword: "Brand-new-pass1" };
    expect(newPasswordSchema.safeParse(ok).success).toBe(true);
    expect(newPasswordSchema.safeParse({ ...ok, newPassword: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ ...ok, newPassword: "nonumberhere", confirmPassword: "nonumberhere" }).success).toBe(false);
    const long = "a1".repeat(37);
    expect(newPasswordSchema.safeParse({ newPassword: long, confirmPassword: long }).success).toBe(false);
    const mismatch = newPasswordSchema.safeParse({ ...ok, confirmPassword: "Different-pass1" });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) expect(mismatch.error.issues[0]!.path).toEqual(["confirmPassword"]);
  });
});
