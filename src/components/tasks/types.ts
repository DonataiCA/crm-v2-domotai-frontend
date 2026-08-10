
import { z } from "zod";

export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  due_date: z.date().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]),
  contact_id: z.string().optional(),
  lead_id: z.string().optional(),
  company_id: z.string().optional(),
  assigned_to: z.string().optional(),
  reminder_date: z.date().optional(),
  progress: z.number().min(0).max(100).optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
