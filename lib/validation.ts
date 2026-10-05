import { z } from "zod";

/** Shape accepted by POST /api/contact. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("A valid email is required.").max(320),
  message: z.string().trim().max(5000).optional().default(""),
  language: z.enum(["fr", "en"]).optional().default("fr"),
  // Honeypot: must stay empty. Bots tend to fill every field.
  company: z.string().max(0).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
