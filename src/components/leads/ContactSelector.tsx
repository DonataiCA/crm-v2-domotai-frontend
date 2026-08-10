
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { useOrganization } from "@/contexts/OrganizationContext";
import { contactService } from "@/services/contact.service";
import { Contact } from "@/types/api";
import { SearchableSelect } from "@/components/common/SearchableSelect";

interface ContactSelectorProps {
  form: UseFormReturn<Record<string, unknown>>;
}

export const ContactSelector = ({ form }: ContactSelectorProps) => {
  const { currentOrganization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["contacts-for-select", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const response = await contactService.getContacts(1, 500);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  if (!currentOrganization) return null;

  const options = [
    { value: "none", label: "None" },
    ...(data || []).map((c: Contact) => ({
      value: c.id,
      label: c.name + (c.company ? ` (${c.company})` : ""),
    })),
  ];

  return (
    <FormField
      control={form.control}
      name="contact_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Contact</FormLabel>
          <FormControl>
            <SearchableSelect
              options={options}
              value={field.value || "none"}
              onChange={(val) => field.onChange(val === "none" ? "" : val)}
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
