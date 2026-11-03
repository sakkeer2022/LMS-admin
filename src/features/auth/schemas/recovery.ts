import { z } from "zod";

const MAX_PASSWORD_BYTES = 72;

export const recoveryEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
});

export const recoveryCodeSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});

/** The platform password rule (8 characters with a number); the backend enforces the same one. */
export const newPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[0-9]/, "Include at least one number")
      .refine(
        (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
        "Use at most 72 bytes",
      ),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match",
  });
