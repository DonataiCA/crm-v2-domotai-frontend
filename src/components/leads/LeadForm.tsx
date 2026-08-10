import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ContactSelector } from "./ContactSelector";
import { PricingFields } from "./form/PricingFields";
import { leadFormSchema, LeadFormValues } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSelector } from "../common/UserSelector";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { leadService } from "@/services/lead.service";
import { companyService } from "@/services/company.service";
import { pipelineService } from "@/services/pipeline.service";
import type { Lead, Pipeline } from "@/types/api";
import { Building2 } from "lucide-react";

interface LeadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Lead> & { id?: string };
  defaultPipelineId?: string;
}

export const LeadForm = ({ onSuccess, onCancel, initialData, defaultPipelineId }: LeadFormProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: companiesData } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => companyService.getCompanies(1, 100),
    enabled: !!currentOrganization,
  });
  const companies = companiesData?.data ?? [];

  // Fetch dynamic pipeline stages instead of hardcoded
  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: pipelineService.getAll,
    enabled: !!currentOrganization,
  });

  const activePipeline = defaultPipelineId
    ? pipelines.find(p => p.id === defaultPipelineId)
    : pipelines.find(p => p.isDefault) || pipelines[0];

  const dynamicStages = (activePipeline?.stages || [])
    .sort((a, b) => a.order - b.order)
    .map(s => ({ value: s.name, label: s.name }));

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      contact_id: initialData?.contact_id || initialData?.contactId || "",
      company_id: initialData?.companyId || "",
      stage: initialData?.stage || "new",
      next_follow_up: initialData?.next_follow_up || initialData?.nextFollowUp || "",
      name: initialData?.name || "",
      pricing_type: initialData?.pricing_type || initialData?.pricingType || "flat",
      price: initialData?.price || 0,
      payment_date: initialData?.payment_date || initialData?.paymentDate || "",
      recurring_start_date: initialData?.recurring_start_date || initialData?.recurringStartDate || "",
      recurring_end_date: initialData?.recurring_end_date || initialData?.recurringEndDate || "",
      assigned_to: initialData?.assigned_to || initialData?.assignedTo || "",
      details: initialData?.details || "",
    },
  });

  const handleSubmit = async (values: LeadFormValues, createAnother: boolean = false) => {
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

      const cleanedValues = {
        contactId: processFieldValue(values.contact_id),
        companyId: processFieldValue(values.company_id),
        stage: values.stage,
        nextFollowUp: values.next_follow_up || null,
        name: values.name,
        pricingType: values.pricing_type,
        price: values.price,
        paymentDate: values.payment_date || null,
        recurringStartDate: values.recurring_start_date || null,
        recurringEndDate: values.recurring_end_date || null,
        assignedTo: processFieldValue(values.assigned_to),
        details: values.details || null,
        pipelineId: initialData?.pipelineId || defaultPipelineId || null,
      };

      if (initialData?.id) {
        await leadService.updateLead(initialData.id, cleanedValues);

        toast({
          title: "Success",
          description: "Lead updated successfully",
        });

        onSuccess?.();
      } else {
        await leadService.createLead(cleanedValues);

        toast({
          title: "Success",
          description: "Lead created successfully",
        });

        if (createAnother) {
          form.reset();
        } else {
          onSuccess?.();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrganization) {
    return <div>Please select an organization to manage leads.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => handleSubmit(values, false))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter lead name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ContactSelector form={form} />

        {/* Company selector */}
        <FormField
          control={form.control}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Company
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                      {company.domain && (
                        <span className="ml-1.5 text-muted-foreground text-xs">
                          {company.domain}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <UserSelector form={form} />

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dynamicStages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="next_follow_up"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Follow-up</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any additional details about this lead..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <PricingFields form={form} />

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Create Lead"}
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
