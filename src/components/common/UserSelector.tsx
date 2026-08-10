
import { useQuery } from "@tanstack/react-query";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { organizationService } from "@/services/organization.service";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SearchableSelect } from "@/components/common/SearchableSelect";

interface UserSelectorProps {
  form: UseFormReturn<Record<string, unknown>>;
  name?: string;
  label?: string;
}

export const UserSelector = ({
  form,
  name = "assigned_to",
  label = "Assigned To"
}: UserSelectorProps) => {
  const { session } = useAuth();
  const { currentOrganization } = useOrganization();

  const { data: users } = useQuery({
    queryKey: ['organization-members', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const members = await organizationService.getMembers(currentOrganization.id);
      return members
        .filter((m) => m.user)
        .map((m) => ({
          id: m.user!.id,
          fullName: m.user!.fullName,
          email: m.user!.email,
        }));
    },
    enabled: !!session && !!currentOrganization,
  });

  if (!session) return null;

  const options = [
    { value: "unassigned", label: "Unassigned" },
    ...(users || []).map((u) => ({
      value: u.id,
      label: u.fullName || u.email,
    })),
  ];

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <SearchableSelect
              options={options}
              value={field.value || "unassigned"}
              onChange={(val) => field.onChange(val === "unassigned" ? "" : val)}
              placeholder="Select user"
              searchPlaceholder="Search members..."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
