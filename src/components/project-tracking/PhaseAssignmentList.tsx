import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Phase {
  id?: string;
  name: string;
  assignedUserId?: string;
}

interface User {
  id: string;
  role: string;
}

interface PhaseAssignmentListProps {
  phases: Phase[];
  onPhasesChange: (phases: Phase[]) => void;
  users: User[];
  onUsersChange: (users: User[]) => void;
}

export const PhaseAssignmentList = ({
  phases,
  onPhasesChange,
  users,
  onUsersChange
}: PhaseAssignmentListProps) => {
  const { currentOrganization } = useOrganization();

  const { data: availableUsers } = useQuery({
    queryKey: ['org-members', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const members = await organizationService.getMembers(currentOrganization.id);
      return members.map(m => ({
        id: m.user?.id || m.userId,
        full_name: m.user?.fullName || null,
        email: m.user?.email || '',
        role: m.user?.role || m.role || ''
      }));
    },
    enabled: !!currentOrganization
  });

  const addPhase = () => {
    onPhasesChange([...phases, { name: "" }]);
  };

  const updatePhase = (index: number, field: keyof Phase, value: string) => {
    const updatedPhases = phases.map((phase, i) =>
      i === index ? { ...phase, [field]: value === "unassigned" ? undefined : value } : phase
    );
    onPhasesChange(updatedPhases);
  };

  const removePhase = (index: number) => {
    onPhasesChange(phases.filter((_, i) => i !== index));
  };

  const getUserName = (userId: string) => {
    const user = availableUsers?.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unknown User';
  };

  const getUserRole = (userId: string) => {
    const user = availableUsers?.find(u => u.id === userId);
    return user?.role || '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Project Phases</Label>
        <Button onClick={addPhase} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Phase
        </Button>
      </div>

      <div className="space-y-3">
        {phases.map((phase, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      Phase {index + 1}
                    </Badge>
                    <Input
                      placeholder="Phase name"
                      value={phase.name}
                      onChange={(e) => updatePhase(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removePhase(index)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="min-w-[120px]">Default Assignee:</Label>
                    <Select
                      value={phase.assignedUserId || "unassigned"}
                      onValueChange={(value) => updatePhase(index, 'assignedUserId', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select user for this phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No default assignee</SelectItem>
                        {availableUsers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <span>{user.full_name || user.email}</span>
                              {user.role && (
                                <Badge variant="secondary" className="text-xs">
                                  {user.role}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {phase.assignedUserId && (
                    <div className="text-sm text-muted-foreground ml-[120px]">
                      Tasks in this phase will be assigned to{' '}
                      <span className="font-medium">{getUserName(phase.assignedUserId)}</span>
                      {getUserRole(phase.assignedUserId) && (
                        <span className="text-muted-foreground">
                          {' '}({getUserRole(phase.assignedUserId)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {phases.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No phases added yet. Click "Add Phase" to get started.</p>
        </div>
      )}
    </div>
  );
};
