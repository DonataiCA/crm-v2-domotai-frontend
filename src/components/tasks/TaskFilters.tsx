import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { useOrganization } from "@/contexts/OrganizationContext";

interface TaskFiltersProps {
  filterStatus: string;
  filterUser: string;
  onStatusChange: (value: string) => void;
  onUserChange: (value: string) => void;
}

export const TaskFilters = ({
  filterStatus,
  filterUser,
  onStatusChange,
  onUserChange
}: TaskFiltersProps) => {
  const { currentOrganization } = useOrganization();

  const { data: users } = useQuery({
    queryKey: ['org-members-for-filters', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const members = await organizationService.getMembers(currentOrganization.id);
      return members.map(m => ({
        id: m.user?.id || m.userId,
        full_name: m.user?.fullName || null,
        email: m.user?.email || ''
      }));
    },
    enabled: !!currentOrganization
  });

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="w-36 sm:w-40">
        <Select
          value={filterStatus}
          onValueChange={onStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-36 sm:w-40">
        <Select
          value={filterUser}
          onValueChange={onUserChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="unassigned">Unassigned Tasks</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
