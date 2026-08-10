
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Calendar, User2, ArrowRight, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays } from "date-fns";
import { taskService } from "@/services/task.service";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Task, ProjectPhase } from "@/types/api";
import { TASK_STATUS_OPTIONS, getPriorityBgColor } from "@/constants";

interface TaskKanbanBoardProps {
  tasks: Task[];
  phases?: ProjectPhase[];
  userRole?: string | null;
  onTaskComplete: (taskId: string) => Promise<void>;
  showOldCompletedTasks?: boolean;
}

export const TaskKanbanBoard = ({
  tasks,
  phases = [],
  userRole,
  onTaskComplete,
  showOldCompletedTasks = false
}: TaskKanbanBoardProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const statusColumns = TASK_STATUS_OPTIONS.map(opt => ({ id: opt.value, label: opt.label }));

  const filterOldCompletedTasks = (task: Task) => {
    if (task.status !== 'COMPLETED' || showOldCompletedTasks) {
      return true;
    }
    if (!task.updatedAt) return true;
    const twoWeeksAgo = addDays(new Date(), -14);
    return parseISO(task.updatedAt) > twoWeeksAgo;
  };

  const filteredTasks = tasks.filter(filterOldCompletedTasks);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }

      await taskService.updateTask(taskId, { status: newStatus });

      toast({
        title: "Task updated",
        description: `Task moved to ${newStatus.replace('_', ' ')}`,
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  const getPhaseNameForTask = (task: Task) => {
    const pid = (task as unknown as { phaseId?: string }).phaseId;
    if (!pid || !phases.length) return null;
    const phase = phases.find(p => p.id === pid);
    return phase ? phase.name : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 280px)' }}>
      {statusColumns.map(column => (
        <div key={column.id} className="flex flex-col min-h-0">
          <div className="bg-background p-2 rounded-t-md border-b-2 font-medium shadow-sm shrink-0">
            <h3 className="mb-1">{column.label}</h3>
            <div className="text-xs text-muted-foreground">
              {filteredTasks.filter(t => t.status === column.id).length} tasks
            </div>
          </div>
          <div className="bg-muted/30 p-2 rounded-md flex-1 space-y-2 overflow-y-auto">
            {filteredTasks.filter(t => t.status === column.id).map(task => {
              const dueDate = task.dueDate;
              const assigneeName = task.assignee?.fullName || task.assignee?.email;
              return (
              <Card key={task.id} className="bg-background shadow-sm">
                <CardHeader className="p-3 pb-1">
                  <div
                    className="font-medium cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    {task.title}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge
                      variant="secondary"
                      className={`text-xs text-white ${getPriorityBgColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>

                    {getPhaseNameForTask(task) && (
                      <Badge variant="outline" className="text-xs flex items-center">
                        <Layers className="h-3 w-3 mr-1" />
                        {getPhaseNameForTask(task)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-1">
                  {assigneeName && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User2 className="h-3 w-3 mr-1" />
                      {assigneeName}
                    </div>
                  )}
                  {dueDate && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due: {format(parseISO(dueDate), 'MMM d, yyyy')}
                    </div>
                  )}
                  <div className="flex justify-between mt-2">
                    {column.id !== 'COMPLETED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onTaskComplete(task.id)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Complete
                      </Button>
                    )}
                    {column.id !== 'COMPLETED' && column.id !== 'ON_HOLD' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs ml-auto"
                        onClick={() => handleStatusChange(task.id, statusColumns[statusColumns.findIndex(c => c.id === column.id) + 1].id)}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      ))}

      <TaskDetailsDialog
        task={selectedTask}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        userRole={userRole}
      />
    </div>
  );
};
