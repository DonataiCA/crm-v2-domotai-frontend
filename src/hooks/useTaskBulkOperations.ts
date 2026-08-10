import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/task.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { TaskPayload } from "@/types/api";

interface BulkTaskData {
  title: string;
  description?: string;
  priority: string;
  status?: string;
  due_date?: string;
  project_id?: string;
  lead_id?: string;
}

export const useTaskBulkOperations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const [isCreating, setIsCreating] = useState(false);

  const createTasksWithAssignments = async (
    tasks: BulkTaskData[],
    assignments: Record<string, string>
  ) => {
    if (!currentOrganization?.id) {
      throw new Error("No organization selected");
    }

    setIsCreating(true);
    const createdTasks = [];
    const errors = [];

    try {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const assignedTo = assignments[i] || null;

        try {
          const taskData: TaskPayload = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status || 'todo',
            assignedTo: assignedTo || null,
            dueDate: task.due_date || null,
            projectId: task.project_id || null,
            leadId: task.lead_id || null,
          };

          await taskService.createTask(taskData);

          createdTasks.push(task.title);
        } catch (error: any) {
          errors.push(`${task.title}: ${error.message}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (createdTasks.length > 0) {
        toast({
          title: "Tasks Created Successfully",
          description: `${createdTasks.length} task(s) created${
            errors.length > 0 ? ` (${errors.length} failed)` : ""
          }`,
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Some Tasks Failed",
          description: `${errors.length} task(s) could not be created`,
          variant: "destructive",
        });
      }

      return {
        success: createdTasks.length,
        errors: errors.length,
        total: tasks.length
      };

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tasks",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTasksWithAssignments,
    isCreating
  };
};
