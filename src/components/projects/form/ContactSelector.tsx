
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { contactService } from "@/services/contact.service";
import { UseFormReturn } from "react-hook-form";
import { ProjectFormValues } from "./types";
import { useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Contact } from "@/types/api";
import { SearchableSelect } from "@/components/common/SearchableSelect";

interface ContactSelectorProps {
  form: UseFormReturn<ProjectFormValues>;
}

export const ContactSelector = ({ form }: ContactSelectorProps) => {
  const { currentOrganization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["contacts-for-projects", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const response = await contactService.getContacts(1, 500);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  useEffect(() => {
    const initialContactIds = form.getValues("contact_ids");
    if (data && data.length > 0 && initialContactIds && initialContactIds.length > 0) {
      const contactExists = initialContactIds.some((id: string) =>
        data.some((c: Contact) => c.id === id)
      );
      if (contactExists) {
        form.setValue("contact_ids", initialContactIds);
      }
    }
  }, [data, form]);

  if (!currentOrganization) return null;

  const options = [
    { value: "none", label: "None" },
    ...(data || []).map((c: Contact) => ({
      value: c.id,
      label: c.name + (c.company ? ` (${c.company})` : ""),
    })),
  ];

  const currentValue = form.watch("contact_ids")?.[0] || "none";

  return (
    <FormField
      control={form.control}
      name="contact_ids"
      render={() => (
        <FormItem>
          <FormLabel>Project Contact</FormLabel>
          <FormControl>
            <SearchableSelect
              options={options}
              value={currentValue}
              onChange={(val) => {
                form.setValue("contact_ids", val && val !== "none" ? [val] : []);
              }}
              placeholder={isLoading ? "Loading contacts..." : "Select a contact"}
              searchPlaceholder="Search contacts..."
              disabled={isLoading}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
