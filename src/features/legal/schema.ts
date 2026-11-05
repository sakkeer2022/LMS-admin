import { z } from "zod";
import { POLICY_TYPES } from "./types";

/** The policy file limit mirrors the backend default (POLICY_MAX_BYTES); the backend is the authority. */
export const MAX_POLICY_BYTES = 10 * 1024 * 1024;

export const uploadSchema = z.object({
  type: z.enum(POLICY_TYPES),
  country: z.string().length(2, "Choose a country"),
  version: z
    .string()
    .trim()
    .regex(
      /^[0-9A-Za-z][0-9A-Za-z._-]{0,19}$/,
      "Use letters, numbers, dots, dashes or underscores (up to 20)",
    ),
  title: z
    .string()
    .trim()
    .min(1, "Enter the document title")
    .max(200, "Use at most 200 characters"),
  effectiveAt: z.string().min(1, "Choose the date it takes effect"),
  file: z
    .custom<File | null>((value) => value === null || value instanceof File)
    .refine((file): file is File => file instanceof File, "Choose the PDF")
    .refine(
      (file) => !(file instanceof File) || file.size <= MAX_POLICY_BYTES,
      "The file is larger than 10 MB",
    )
    .refine(
      (file) =>
        !(file instanceof File) ||
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
      "The file must be a PDF",
    ),
});

export type UploadValues = z.infer<typeof uploadSchema>;
