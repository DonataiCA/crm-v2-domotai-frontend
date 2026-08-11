
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
import { CalendarIcon } from "lucide-react";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ProjectPhase } from "@/types/api";

const phaseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  status: z.string().optional(),
}).superRefine((values, ctx) => {
  // The end-date picker blocks earlier days, but the range can still be inverted by
  // picking the end first and moving the start forward afterwards.
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "End date must be on or after the start date",
    });
  }
});

type PhaseFormValues = z.infer<typeof phaseFormSchema>;

interface PhaseFormProps {
  projectId: string;
  initialData?: Partial<ProjectPhase>;
  onSuccess?: () => void;
}

export const PhaseForm = ({ projectId, initialData, onSuccess }: PhaseFormProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseDateString = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const parsedDate = new Date(dateString);
      return isValid(parsedDate) ? parsedDate : null;
    } catch (error) {
      return null;
    }
  };

  const defaultValues: PhaseFormValues = {
    name: initialData?.name || "",
    description: initialData?.description || "",
    start_date: parseDateString(initialData?.start_date || initialData?.startDate),
    end_date: parseDateString(initialData?.end_date || initialData?.endDate),
    status: initialData?.status || "active",
  };

  const form = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues,
  });

  const onSubmit = async (values: PhaseFormValues) => {
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
        name: values.name,
        description: values.description || null,
        startDate: values.start_date && isValid(values.start_date)
          ? values.start_date.toISOString()
          : null,
        endDate: values.end_date && isValid(values.end_date)
          ? values.end_date.toISOString()
          : null,
        status: values.status,
      };

      if (initialData?.id) {
        await projectService.updatePhase(initialData.id, formattedValues);

        toast({
          title: "Success",
          description: "Phase updated successfully",
        });
      } else {
        await projectService.createPhase(projectId, formattedValues);

        toast({
          title: "Success",
          description: "Phase created successfully",
        });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save phase",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Phase name" {...field} />
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
                <Textarea placeholder="Phase description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value ? "text-muted-foreground" : ""
                        )}
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
                        // Re-check the range so an already picked end date flags immediately.
                        form.trigger("end_date");
                      }}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value ? "text-muted-foreground" : ""
                        )}
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
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </FormControl>
              <FormDescription>
                Current status of this phase
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : initialData
                ? "Update Phase"
                : "Create Phase"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
