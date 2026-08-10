import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { organizationService } from "@/services/organization.service";
import { projectService } from "@/services/project.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import type { ProjectTeamMember } from "@/types/api";

interface ProjectTeamMembersSectionProps {
  projectId: string;
  projectLeadId?: string | null;
}

export const ProjectTeamMembersSection = ({ projectId, projectLeadId }: ProjectTeamMembersSectionProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [pickerValue, setPickerValue] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["organization-members", currentOrganization?.id],
    queryFn: () => currentOrganization ? organizationService.getMembers(currentOrganization.id) : Promise.resolve([]),
    enabled: !!currentOrganization,
  });

  const { data: teamMembers = [], refetch } = useQuery<ProjectTeamMember[]>({
    queryKey: ["project-team-members", projectId],
    queryFn: () => projectService.getMembers(projectId),
    enabled: !!projectId,
  });

  const memberIds = useMemo(() => new Set(teamMembers.map(m => m.userId)), [teamMembers]);

  const availableMembers = useMemo(() => {
    return orgMembers
      .filter((m: any) => m.user)
      .filter((m: any) => !memberIds.has(m.user.id))
      .map((m: any) => ({
        value: m.user.id,
        label: m.user.fullName || m.user.email,
      }));
  }, [orgMembers, memberIds]);

  const handleAdd = async () => {
    if (!pickerValue) return;
    setAdding(true);
    try {
      await projectService.addMember(projectId, pickerValue);
      setPickerValue("");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["all-projects"] });
      toast({ title: "Team member added" });
    } catch (e: any) {
      toast({
        title: "Failed to add member",
        description: e?.response?.data?.error || e?.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await projectService.removeMember(projectId, userId);
      await refetch();
      toast({ title: "Team member removed" });
    } catch (e: any) {
      toast({
        title: "Failed to remove member",
        description: e?.response?.data?.error || e?.message,
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-md bg-muted/20">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-semibold">Team Members</Label>
        <span className="text-xs text-muted-foreground">
          ({teamMembers.length})
        </span>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Coworkers added here will receive email notifications about this project.
      </p>

      {/* Current team list */}
      {teamMembers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {teamMembers.map((member) => {
            const isLead = projectLeadId && member.userId === projectLeadId;
            return (
              <Badge
                key={member.id}
                variant="secondary"
                className="gap-1.5 pl-2 pr-1 py-1 text-xs"
              >
                {isLead && <span className="text-[10px] font-bold text-primary">LEAD</span>}
                {member.user?.fullName || member.user?.email || "Unknown"}
                <button
                  type="button"
                  onClick={() => handleRemove(member.userId)}
                  disabled={removingId === member.userId}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  title="Remove"
                >
                  {removingId === member.userId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No team members yet</p>
      )}

      {/* Add member picker */}
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchableSelect
            options={availableMembers}
            value={pickerValue}
            onChange={setPickerValue}
            placeholder="Pick a coworker to add..."
            searchPlaceholder="Search by name or email..."
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!pickerValue || adding}
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </div>
    </div>
  );
};
