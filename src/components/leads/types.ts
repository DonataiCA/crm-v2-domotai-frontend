import { z } from "zod";

export const leadFormSchema = z.object({
  contact_id: z.string(),
  company_id: z.string().optional().or(z.literal("")),
  stage: z.string().min(1, "Stage is required"),
  next_follow_up: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Name is required"),
  pricing_type: z.enum(["flat", "recurring"]).default("flat"),
  price: z.number().min(0, "Price must be positive").default(0),
  payment_date: z.string().optional().or(z.literal("")),
  recurring_start_date: z.string().optional().or(z.literal("")),
  recurring_end_date: z.string().optional().or(z.literal("")),
  assigned_to: z.string().optional().or(z.literal("")),
  details: z.string().optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;