import { z } from "zod";
export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});
