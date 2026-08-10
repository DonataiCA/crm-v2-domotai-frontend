import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "./TaskForm";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Task } from "@/types/api";

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  userRole?: string | null;
}

export const TaskDetailsDialog = ({ task, open, onOpenChange, onUpdate, userRole }: TaskDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditing(false);
    }
    onOpenChange(newOpen);
  };

  // If no task is provided, show a placeholder dialog
  if (!task) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No task selected</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Check if user can edit the task (salesmen can edit any task)
  const canEdit = userRole === 'salesman';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? "Edit Task" : task.title}</DialogTitle>
            {!isEditing && canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {isEditing ? (
            <TaskForm
              taskId={task.id}
              initialData={task}
              onSuccess={() => {
                setIsEditing(false);
                onUpdate?.();
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-sm text-muted-foreground">{task.description || "No description"}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium">Status</h4>
                <p className="text-sm text-muted-foreground capitalize">{task.status}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium">Priority</h4>
                <p className="text-sm text-muted-foreground capitalize">{task.priority}</p>
              </div>

              {task.due_date && (
                <div>
                  <h4 className="text-sm font-medium">Due Date</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {task.assigned_to && (
                <div>
                  <h4 className="text-sm font-medium">Assigned To</h4>
                  <p className="text-sm text-muted-foreground">
                    {task.assignee?.full_name || task.assignee?.email || 'Unknown User'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};