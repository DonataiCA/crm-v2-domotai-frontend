import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { TASK_PRIORITY_OPTIONS } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserSelector } from "@/components/common/UserSelector";
import { TagSelector } from "./TagSelector";
import type { ProjectPhase, ProjectTask } from '@/types/api';

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  conclusion: z.string().optional(),
  phase_id: z.string().optional().nullable(),
  status: z.string().default("TODO"),
  priority: z.string().default("MEDIUM"),
  assigned_to: z.string().optional().nullable(),
  start_date: z.date().optional().nullable(),
  due_date: z.date().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// A new task must belong to a phase. Editing skips that rule so tasks that are already
// unassigned stay editable instead of being locked until a phase is picked. The date-range
// rule applies to both: the due-date picker blocks earlier days, but the range can still be
// inverted by picking the due date first and moving the start date forward afterwards.
const buildTaskFormSchema = (requirePhase: boolean) =>
  taskFormSchema.superRefine((values, ctx) => {
    if (requirePhase && !values.phase_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phase_id"],
        message: "Phase is required",
      });
    }

    if (values.start_date && values.due_date && values.due_date < values.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["due_date"],
        message: "Due date must be on or after the start date",
      });
    }
  });

interface TaskFormProps {
  projectId: string;
  phases: ProjectPhase[];
  initialData?: Partial<ProjectTask>;
  onSuccess?: () => void;
}

export const TaskForm = ({ projectId, phases, initialData, onSuccess }: TaskFormProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: TaskFormValues = {
    title: initialData?.title || "",
    description: initialData?.description || "",
    conclusion: initialData?.conclusion || "",
    phase_id: initialData?.phaseId || null,
    status: initialData?.status?.toUpperCase() || "TODO",
    priority: initialData?.priority?.toUpperCase() || "MEDIUM",
    assigned_to: initialData?.assignedTo || null,
    start_date: initialData?.startDate ? parseISO(initialData.startDate) : null,
    due_date: initialData?.dueDate ? parseISO(initialData.dueDate) : null,
  };

  const isEditing = Boolean(initialData?.id);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(buildTaskFormSchema(!isEditing)),
    defaultValues,
  });

  const onSubmit = async (values: TaskFormValues) => {
    if (!currentOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedValues = {
        title: values.title,
        description: values.description || null,
        conclusion: values.conclusion || null,
        phaseId: values.phase_id || null,
        status: values.status,
        priority: values.priority,
        assignedTo: values.assigned_to || null,
        startDate: values.start_date ? values.start_date.toISOString() : null,
        dueDate: values.due_date ? values.due_date.toISOString() : null,
      };

      if (initialData?.id) {
        await projectService.updateProjectTask(initialData.id, formattedValues);

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        await projectService.createProjectTask(projectId, formattedValues);

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Task description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="conclusion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conclusion</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="How was this task resolved? Document the outcome..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional — describe how the task was completed for traceability
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {initialData?.id && (
          <TagSelector
            taskId={initialData.id}
            selectedTags={(initialData.taskTags || []).map(tt => tt.tag)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Done</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    {TASK_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phase_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phase{!isEditing && " *"}</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                  value={field.value || ""}
                >
                  <option value="">
                    {isEditing ? "Unassigned" : "Select a phase..."}
                  </option>
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                {isEditing
                  ? "Assign this task to a project phase"
                  : phases.length === 0
                    ? "This project has no work areas yet — create one before adding tasks"
                    : "Every task must belong to a phase"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <UserSelector
          form={form}
          name="assigned_to"
          label="Assigned To"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""
                          }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={(date) => {
                        field.onChange(date);
                        // Re-check the range so an already picked due date flags immediately.
                        form.trigger("due_date");
                      }}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""
                          }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01") ||
                        (form.getValues("start_date")
                          ? date < form.getValues("start_date")!
                          : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : initialData?.id
                ? "Update Task"
                : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
