
import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/task.service";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { addDays, parseISO } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Task } from "@/types/api";
import { TASK_STATUS_OPTIONS } from "@/constants";

interface TaskListViewProps {
  tasks: Task[];
  userRole?: string | null;
  onTaskComplete: (taskId: string) => Promise<void>;
  showOldCompletedTasks?: boolean;
}

export const TaskListView = ({
  tasks,
  userRole,
  onTaskComplete,
  showOldCompletedTasks = false
}: TaskListViewProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    todo: true,
    in_progress: true,
    on_hold: true,
    completed: false
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const statusSections = TASK_STATUS_OPTIONS.map(opt => ({ id: opt.value, label: opt.label }));

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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const filterOldCompletedTasks = (task: Task) => {
    if (task.status !== 'COMPLETED' || showOldCompletedTasks) {
      return true;
    }

    const updatedAt = (task as unknown as { updatedAt?: string }).updatedAt;
    if (!updatedAt) return true;

    const updatedDate = parseISO(updatedAt);
    const oneWeekAgo = addDays(new Date(), -7);

    return updatedDate > oneWeekAgo;
  };

  const filteredTasks = tasks.filter(filterOldCompletedTasks);

  return (
    <div className="space-y-6">
      {statusSections.map(section => {
        const sectionTasks = filteredTasks.filter(task => task.status === section.id);
        if (sectionTasks.length === 0) return null;

        return (
          <Collapsible
            key={section.id}
            open={expandedSections[section.id]}
            onOpenChange={() => toggleSection(section.id)}
            className="border rounded-md overflow-hidden"
          >
            <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 hover:bg-transparent">
                  <h3 className="text-lg font-medium flex items-center">
                    {expandedSections[section.id] ? (
                      <ChevronUp className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    )}
                    {section.label}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({sectionTasks.length})
                    </span>
                  </h3>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onTaskClick={handleTaskClick}
                    onDeleteClick={(task) => {
                      setTaskToDelete(task);
                      setShowDeleteConfirm(true);
                    }}
                    onTaskComplete={onTaskComplete}
                    userRole={userRole}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

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
