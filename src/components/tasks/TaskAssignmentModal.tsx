import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Users, User } from "lucide-react";

interface TaskAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Array<{
    id?: string;
    title: string;
    description?: string;
    priority: string;
    assigned_to?: string;
  }>;
  onAssignmentsChange: (assignments: Record<string, string>) => void;
  onSave: () => void;
}

export const TaskAssignmentModal = ({
  open,
  onOpenChange,
  tasks,
  onAssignmentsChange,
  onSave
}: TaskAssignmentModalProps) => {
  const { currentOrganization } = useOrganization();
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [bulkAssignee, setBulkAssignee] = useState<string>("");

  const { data: users } = useQuery({
    queryKey: ['org-members-for-assignment', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const members = await organizationService.getMembers(currentOrganization.id);
      return members.map(m => ({
        id: m.user?.id || m.userId,
        full_name: m.user?.fullName || null,
        email: m.user?.email || ''
      }));
    },
    enabled: !!currentOrganization && open
  });

  const handleAssignment = (taskIndex: number, userId: string) => {
    const newAssignments = {
      ...assignments,
      [taskIndex]: userId === "unassigned" ? "" : userId
    };
    setAssignments(newAssignments);
    onAssignmentsChange(newAssignments);
  };

  const handleBulkAssign = () => {
    if (!bulkAssignee) return;

    const newAssignments: Record<string, string> = {};
    tasks.forEach((_, index) => {
      newAssignments[index] = bulkAssignee === "unassigned" ? "" : bulkAssignee;
    });
    setAssignments(newAssignments);
    onAssignmentsChange(newAssignments);
    setBulkAssignee("");
  };

  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const getUnassignedCount = () => {
    return tasks.length - Object.keys(assignments).filter(key => assignments[key]).length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Tasks to Team Members
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Assign the generated tasks to team members. You can skip this step and assign them manually later.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4" />
              <span className="font-medium">Bulk Assignment</span>
              <Badge variant="outline">
                {getUnassignedCount()} unassigned
              </Badge>
            </div>
            <div className="flex gap-2">
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user to assign all tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Leave Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkAssign}
                disabled={!bulkAssignee}
                variant="outline"
              >
                Assign All
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="w-48 flex-shrink-0">
                    <Select
                      value={assignments[index] || "unassigned"}
                      onValueChange={(value) => handleAssignment(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleSkip}>
            Skip - Assign Later
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Tasks with Assignments
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
