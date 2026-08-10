
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { contactService } from "@/services/contact.service";
import { leadService } from "@/services/lead.service";
import { companyService } from "@/services/company.service";
import { UseFormReturn } from "react-hook-form";
import { TaskFormValues } from "../types";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserSelector } from "@/components/common/UserSelector";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import type { ContactRef, LeadRef, Company } from "@/types/api";

interface AssociationFieldsProps {
  form: UseFormReturn<TaskFormValues>;
}

export function AssociationFields({ form }: AssociationFieldsProps) {
  const { currentOrganization } = useOrganization();

  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts-for-tasks", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const response = await contactService.getContacts(1, 500);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["leads-for-tasks", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const response = await leadService.getLeads(1, 500);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["companies-for-tasks", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const response = await companyService.getCompanies(1, 100);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const contacts = contactsData || [];
  const leads = leadsData || [];
  const companies = companiesData || [];

  if (!currentOrganization) {
    return <div className="text-center py-4">Please select an organization to continue</div>;
  }

  const contactOptions = [
    { value: "none", label: "None" },
    ...contacts.map((c: ContactRef) => ({
      value: c.id,
      label: c.name + (c.company ? ` (${c.company})` : ""),
    })),
  ];

  const leadOptions = [
    { value: "none", label: "None" },
    ...leads.map((l: LeadRef) => ({ value: l.id, label: l.name })),
  ];

  const companyOptions = [
    { value: "none", label: "None" },
    ...companies.map((c: Company) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Associated With</h3>

      <UserSelector form={form} name="assigned_to" label="Assigned To" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={companyOptions}
                  value={field.value || "none"}
                  onChange={(val) => field.onChange(val === "none" ? "" : val)}
                  placeholder="Select company"
                  searchPlaceholder="Search companies..."
                  disabled={isLoadingCompanies}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={contactOptions}
                  value={field.value || "none"}
                  onChange={(val) => field.onChange(val === "none" ? "" : val)}
                  placeholder="Select contact"
                  searchPlaceholder="Search contacts..."
                  disabled={isLoadingContacts}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lead_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={leadOptions}
                  value={field.value || "none"}
                  onChange={(val) => field.onChange(val === "none" ? "" : val)}
                  placeholder="Select lead"
                  searchPlaceholder="Search leads..."
                  disabled={isLoadingLeads}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
