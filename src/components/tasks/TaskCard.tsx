
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Calendar, Mail, Building2, User2, Trash2, Check, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { taskService } from "@/services/task.service";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQueryClient } from "@tanstack/react-query";
import { isTaskUrgent } from "@/lib/utils";
import type { Task } from "@/types/api";
import { getPriorityBgColor } from "@/constants";

interface TaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onDeleteClick: (task: Task) => void;
  onTaskComplete?: (taskId: string) => Promise<void>;
  userRole?: string | null;
}

export const TaskCard = ({
  task,
  onTaskClick,
  onDeleteClick,
  onTaskComplete,
  userRole
}: TaskCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }

      await taskService.updateTask(task.id, { status: newStatus });

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "Status updated",
        description: `Task status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleDueDateChange = async (newDate: string) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }

      await taskService.updateTask(task.id, { dueDate: newDate });

      setIsEditingDueDate(false);

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "Due date updated",
        description: "Task due date has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTaskComplete) {
      await onTaskComplete(task.id);
    }
  };

  const canDelete = userRole === 'salesman';

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  };

  const dueDate = task.dueDate;
  const assigneeName = task.assignee?.fullName;
  const contactEmail = task.contact?.email;
  const leadName = task.lead?.name;
  const companyName = task.company?.name;

  const urgent = isTaskUrgent(task);

  return (
    <Card
      className={`bg-muted/50 hover:bg-muted/70 transition-colors relative max-w-sm ${
        urgent ? 'border-red-500 bg-red-50 hover:bg-red-100' : ''
      }`}
    >
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(task);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <CardHeader className="p-4 pb-2">
        <div className="font-medium cursor-pointer" onClick={() => onTaskClick(task)}>{task.title}</div>
        {(companyName || task.contact?.name || leadName) && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {companyName && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); navigate(`/companies/${task.companyId}`); }}
              >
                <Building2 className="h-3 w-3" />
                <span>{companyName}</span>
              </button>
            )}
            {task.contact?.name && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${task.contactId}`); }}
              >
                <User2 className="h-3 w-3" />
                <span>{task.contact.name}</span>
              </button>
            )}
            {leadName && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); navigate(`/leads/${task.leadId}`); }}
              >
                <Target className="h-3 w-3" />
                <span>{leadName}</span>
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="secondary"
            className={`text-xs text-white ${getPriorityBgColor(task.priority)}`}
          >
            {task.priority}
          </Badge>
          <Select
            defaultValue={task.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="h-7 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-2">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center text-sm">
          <User2 className="h-3 w-3 mr-1" />
          <span className={assigneeName ? '' : 'text-orange-500 font-medium'}>
            {assigneeName || "Unassigned"}
          </span>
          {!assigneeName && (
            <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-600 border-orange-200">
              Needs Assignment
            </Badge>
          )}
        </div>

        {contactEmail && (
          <div className="flex items-center text-sm">
            <Mail className="h-3 w-3 mr-1" />
            {contactEmail}
          </div>
        )}

        {dueDate && (
          <div className="flex items-center text-sm gap-2">
            <Calendar className="h-3 w-3" />
            {isEditingDueDate ? (
              <Input
                type="date"
                defaultValue={dueDate}
                className="h-7 w-32"
                onBlur={(e) => handleDueDateChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDueDateChange(e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setIsEditingDueDate(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <span
                className="cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingDueDate(true);
                }}
              >
                Due: {formatDate(dueDate)}
              </span>
            )}
          </div>
        )}

        {task.progress !== null && task.progress !== undefined && (
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        )}

        {task.status !== 'COMPLETED' && onTaskComplete && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={handleComplete}
          >
            <Check className="h-4 w-4 mr-1" /> Complete Task
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
