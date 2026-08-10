
import { z } from "zod";

export const contactFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters").transform(val => val.trim()),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  role: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  lead_source: z.string().optional().or(z.literal("")),
  category: z.enum(["prospect", "active", "past"]),
  assigned_to: z.string().optional().or(z.literal("")),
  organization_id: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
