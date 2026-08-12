import { useQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useOrganization } from "@/contexts/OrganizationContext";
import { organizationService } from "@/services/organization.service";
import { ProjectFormValues } from "./types";
import { UserCog } from "lucide-react";
import { isTeamMemberRole } from "@/constants";

interface ProjectLeadFieldProps {
  form: UseFormReturn<ProjectFormValues>;
}

export const ProjectLeadField = ({ form }: ProjectLeadFieldProps) => {
  const { currentOrganization } = useOrganization();

  const { data: members = [] } = useQuery({
    queryKey: ["organization-members", currentOrganization?.id],
    queryFn: () => currentOrganization ? organizationService.getMembers(currentOrganization.id) : Promise.resolve([]),
    enabled: !!currentOrganization,
  });

  // Restrict project leads to team roles (admin/salesman/freelancer)
  const options = [
    { value: "__none__", label: "Unassigned" },
    ...members
      .filter((m: any) => m.user)
      .filter((m: any) => isTeamMemberRole(m.user.role || m.role))
      .map((m: any) => ({
        value: m.user.id,
        label: `${m.user.fullName || m.user.email}${m.user.role ? ` · ${m.user.role}` : ""}`,
      })),
  ];

  return (
    <FormField
      control={form.control}
      name="project_lead_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5" />
            Project Lead
          </FormLabel>
          <FormControl>
            <SearchableSelect
              options={options}
              value={field.value || "__none__"}
              onChange={(val) => field.onChange(val === "__none__" ? "" : val)}
              placeholder="Select project lead"
              searchPlaceholder="Search team members..."
            />
          </FormControl>
          <FormDescription className="text-xs">
            Main responsible for the project. Receives all key notifications.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
