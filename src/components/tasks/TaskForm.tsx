
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { taskService } from "@/services/task.service";
import { BasicInfoFields } from "./form/BasicInfoFields";
import { StatusFields } from "./form/StatusFields";
import { DateFields } from "./form/DateFields";
import { AssociationFields } from "./form/AssociationFields";
import { taskFormSchema, TaskFormValues } from "./types";
import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Task, TaskPayload } from "@/types/api";

interface TaskFormProps {
  leadId?: string;
  taskId?: string;
  initialData?: Partial<Task> & { id?: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TaskForm = ({ leadId, taskId, initialData, onSuccess, onCancel }: TaskFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentOrganization } = useOrganization();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      priority: initialData?.priority?.toUpperCase() || "MEDIUM",
      status: initialData?.status?.toUpperCase() || "TODO",
      progress: initialData?.progress || 0,
      due_date: initialData?.due_date ? new Date(initialData.due_date) :
                initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      reminder_date: initialData?.reminder_date ? new Date(initialData.reminder_date) :
                     initialData?.reminderDate ? new Date(initialData.reminderDate) : undefined,
      lead_id: initialData?.lead_id || initialData?.leadId || leadId || "",
      contact_id: initialData?.contact_id || initialData?.contactId || "",
      company_id: initialData?.companyId || "",
      assigned_to: initialData?.assigned_to || initialData?.assignedTo || "",
    },
  });

  const onSubmit = async (values: TaskFormValues) => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const processFieldValue = (value: string | undefined | null) => {
        if (value === "none" || value === "") {
          return null;
        }
        return value;
      };

      const taskData: TaskPayload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        progress: values.progress,
        dueDate: values.due_date?.toISOString().split('T')[0] || null,
        reminderDate: values.reminder_date?.toISOString() || null,
        leadId: processFieldValue(values.lead_id),
        contactId: processFieldValue(values.contact_id),
        companyId: processFieldValue(values.company_id),
        assignedTo: processFieldValue(values.assigned_to),
      };

      if (taskId) {
        await taskService.updateTask(taskId, taskData);
      } else {
        await taskService.createTask(taskData);
      }

      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (leadId) {
        await queryClient.invalidateQueries({ queryKey: ["tasks", leadId] });
      }

      toast({
        title: "Success",
        description: `Task ${taskId ? "updated" : "created"} successfully`,
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${taskId ? "update" : "create"} task`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrganization) {
    return <div>Please select an organization to manage tasks.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <BasicInfoFields form={form} />
        <StatusFields form={form} />
        <DateFields form={form} />
        <AssociationFields form={form} />

        <div className="flex justify-between gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : taskId ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
