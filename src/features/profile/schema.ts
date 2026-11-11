import { z } from "zod";

// Mirrors PUT /admin/me/profile. An empty mobile number or time zone is sent as null.
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(150, "Use 150 characters or fewer"),
  // "+91 9876543210" from the phone field; sent as E.164 ("+919876543210")
  mobileNumber: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) => v === null || /^\+[1-9][0-9]{7,14}$/.test(v),
      "Enter a valid number for the chosen country code",
    ),
  timezone: z.string().transform((v) => (v === "" ? null : v)),
});
export type ProfileValues = z.input<typeof profileSchema>;
