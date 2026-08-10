import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/task.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Trash2, Eye, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { isTaskUrgent } from "@/lib/utils";
import type { Task } from "@/types/api";
import { getPriorityBadgeVariant, getStatusBadgeVariant } from "@/constants";

interface TaskTableViewProps {
  tasks: Task[];
  userRole?: string | null;
  onTaskComplete: (taskId: string) => Promise<void>;
  showOldCompletedTasks?: boolean;
}

export const TaskTableView = ({
  tasks,
  userRole,
  onTaskComplete,
  showOldCompletedTasks = false
}: TaskTableViewProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

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

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const urgent = isTaskUrgent(task);
              const dueDate = task.dueDate;
              const assigneeName = task.assignee?.fullName;
              return (
              <TableRow
                key={task.id}
                className={`cursor-pointer transition-colors ${
                  urgent
                    ? 'bg-red-50 hover:bg-red-100'
                    : 'hover:bg-muted/50'
                }`}
              >
                <TableCell
                  onClick={() => handleTaskClick(task)}
                  className="font-medium max-w-xs"
                >
                  <div>
                    <div className="font-medium truncate">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground truncate mt-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => handleTaskClick(task)}>
                  <Badge variant={getStatusBadgeVariant(task.status) as "default" | "secondary" | "destructive" | "outline"}>
                    {task.status?.replace('_', ' ') || 'No Status'}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => handleTaskClick(task)}>
                  <Badge variant={getPriorityBadgeVariant(task.priority) as "default" | "secondary" | "destructive" | "outline"}>
                    {task.priority || 'No Priority'}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => handleTaskClick(task)}>
                  <div className="text-sm">
                    {assigneeName || 'Unassigned'}
                  </div>
                </TableCell>
                <TableCell onClick={() => handleTaskClick(task)}>
                  <div className="text-sm">
                    {dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : 'No due date'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTaskClick(task)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {task.status !== 'COMPLETED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTaskComplete(task.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {(userRole === 'salesman' || task.createdBy === (task as unknown as { current_user_id?: string }).current_user_id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTaskToDelete(task);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
};
