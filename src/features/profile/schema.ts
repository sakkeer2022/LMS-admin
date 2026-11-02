import { z } from "zod";

// Mirrors PUT /admin/me/profile. An empty mobile number or time zone is sent as null.
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(150, "Use 150 characters or fewer"),
  mobileNumber: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) => v === null || /^\+[1-9][0-9]{7,14}$/.test(v),
      "Use international format, e.g. +919876543210",
    ),
  timezone: z.string().transform((v) => (v === "" ? null : v)),
});
export type ProfileValues = z.input<typeof profileSchema>;
