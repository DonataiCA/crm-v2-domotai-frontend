
import { z } from "zod";

export const projectFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(["Not Started", "In Progress", "On Hold", "Completed"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  contact_ids: z.array(z.string()).default([]),
  pricing_type: z.enum(["flat", "recurring"]).default("flat"),
  price: z.number().min(0, "Price must be positive").default(0),
  payment_date: z.string().optional(),
  recurring_start_date: z.string().optional(),
  recurring_end_date: z.string().optional(),
  organization_id: z.string().optional(),
  // Git integration fields
  repository_url: z.string().optional(),
  production_url: z.string().optional(),
  github_owner: z.string().optional(),
  repository_name: z.string().optional(),
  default_branch: z.string().optional(),
  // Project lead (optional)
  project_lead_id: z.string().optional(),
  // Adding project_contacts to the schema as optional
  project_contacts: z.array(z.object({
    contact_id: z.string().optional(),
    contacts: z.object({
      id: z.string().optional(),
      name: z.string().optional()
    }).optional()
  })).optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
