
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { projectService } from "@/services/project.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { projectFormSchema, type ProjectFormValues } from "./form/types";
import { ProjectStatus, normalizeProjectStatus } from "@/constants";
import { ContactSelector } from "./form/ContactSelector";
import { BasicInfoFields } from "./form/BasicInfoFields";
import { DateFields } from "./form/DateFields";
import { PricingFields } from "./form/PricingFields";
import { GitIntegrationFields } from "./form/GitIntegrationFields";
import { ProjectLeadField } from "./form/ProjectLeadField";
import { ProjectTeamMembersSection } from "./form/ProjectTeamMembersSection";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";

interface ProjectFormProps {
  onSuccess?: (projectId?: string) => void;
  onCancel?: () => void;
  initialData?: ProjectFormValues;
}

export const ProjectForm = ({ onSuccess, onCancel, initialData }: ProjectFormProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractContactIds = () => {
    if (initialData && initialData.project_contacts && initialData.project_contacts.length > 0) {
      return initialData.project_contacts.map(pc =>
        pc.contacts && pc.contacts.id ? pc.contacts.id : pc.contact_id
      ).filter(Boolean);
    }
    return initialData?.contact_ids || [];
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      status: normalizeProjectStatus(initialData?.status) ?? ProjectStatus.NOT_STARTED,
      start_date: initialData?.start_date || "",
      end_date: initialData?.end_date || "",
      contact_ids: extractContactIds(),
      pricing_type: initialData?.pricing_type || "flat",
      price: initialData?.price || 0,
      payment_date: initialData?.payment_date || "",
      recurring_start_date: initialData?.recurring_start_date || "",
      recurring_end_date: initialData?.recurring_end_date || "",
      repository_url: initialData?.repository_url || "",
      production_url: initialData?.production_url || "",
      github_owner: initialData?.github_owner || "",
      repository_name: initialData?.repository_name || "",
      default_branch: initialData?.default_branch || "main",
      project_lead_id: (initialData as any)?.project_lead_id || (initialData as any)?.projectLeadId || "",
    },
  });

  const handleSubmit = async (values: ProjectFormValues, createAnother: boolean = false) => {
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

      const cleanedValues = {
        name: values.name.trim(),
        description: values.description,
        status: values.status,
        startDate: values.start_date || null,
        endDate: values.end_date || null,
        pricingType: values.pricing_type,
        price: values.price,
        paymentDate: values.payment_date || null,
        recurringStartDate: values.recurring_start_date || null,
        recurringEndDate: values.recurring_end_date || null,
        repositoryUrl: values.repository_url || null,
        productionUrl: values.production_url || null,
        githubOwner: values.github_owner || null,
        repositoryName: values.repository_name || null,
        defaultBranch: values.default_branch || null,
        projectLeadId: values.project_lead_id || null,
      };

      if (initialData?.id) {
        await projectService.updateProject(initialData.id, cleanedValues);

        // Set contacts if provided
        if (values.contact_ids) {
          await projectService.setContacts(initialData.id, values.contact_ids);
        }

        toast({
          title: "Success",
          description: "Project updated successfully",
        });

        onSuccess?.(initialData.id);
      } else {
        const created = await projectService.createProject(cleanedValues);

        // Set contacts if provided
        if (values.contact_ids && values.contact_ids.length > 0 && created.id) {
          await projectService.setContacts(created.id, values.contact_ids);
        }

        toast({
          title: "Success",
          description: "Project created successfully",
        });

        if (createAnother) {
          form.reset();
        } else {
          onSuccess?.(created.id);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrganization) {
    return <div>Please select an organization to manage projects.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => handleSubmit(values, false))} className="space-y-4">
        <BasicInfoFields form={form} />
        <ProjectLeadField form={form} />
        <ContactSelector form={form} />
        <DateFields form={form} />
        <PricingFields form={form} />
        <GitIntegrationFields form={form} />
        {initialData?.id && (
          <ProjectTeamMembersSection
            projectId={initialData.id}
            projectLeadId={form.watch("project_lead_id")}
          />
        )}
        <div className="flex justify-between items-center">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? 'Save Changes' : 'Create Project'}
            </Button>
            {!initialData && (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => form.handleSubmit((values) => handleSubmit(values, true))()}
              >
                {isSubmitting ? "Saving..." : "Save & Create Another"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
};
