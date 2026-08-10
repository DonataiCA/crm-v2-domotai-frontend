import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/task.service";
import { useState } from "react";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { TaskCard } from "./TaskCard";
import { TaskFilters } from "./TaskFilters";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "../ui/button";
import type { Task } from "@/types/api";

interface TaskListProps {
  leadId?: string;
}

export const TaskList = ({ leadId }: TaskListProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todo");
  const [filterUser, setFilterUser] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { session, userRole } = useAuth();

  // Set current user as default filter on mount
  useState(() => {
    if (session?.user?.id) {
      setFilterUser(session.user.id);
    }
  });

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ["tasks", leadId, filterStatus, filterUser, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      const filters: Record<string, string> = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterUser !== "all") filters.assignedTo = filterUser;
      if (leadId) filters.leadId = leadId;

      const response = await taskService.getTasks(1, 100, filters);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const handleDelete = async () => {
    if (!taskToDelete?.id || isDeleting || !currentOrganization) return;

    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);

      await taskService.deleteTask(taskToDelete.id);

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setTaskToDelete(null);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
        <h3 className="text-lg font-medium mb-2">No Organization Selected</h3>
        <p className="text-muted-foreground mb-4">Please select an organization to view tasks.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
        <h3 className="text-lg font-medium mb-2">Error Loading Tasks</h3>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaskFilters
        filterStatus={filterStatus}
        filterUser={filterUser}
        onStatusChange={setFilterStatus}
        onUserChange={setFilterUser}
      />

      {tasks && tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskClick={handleTaskClick}
              onDeleteClick={(task) => {
                setTaskToDelete(task);
                setShowDeleteConfirm(true);
              }}
              userRole={userRole}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
          <p className="text-muted-foreground">
            {filterStatus !== "all" || filterUser !== "all"
              ? "Try changing your filters to see more tasks."
              : "Create a new task to get started."}
          </p>
        </div>
      )}

      <TaskDetailsDialog
        task={selectedTask}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        userRole={userRole}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
};
