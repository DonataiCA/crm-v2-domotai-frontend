import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/task.service";
import { organizationService } from "@/services/organization.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, Plus, User2, CheckCircle2, Clock, PauseCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskPayload } from "@/types/api";

interface EntityTaskListProps {
  entityType: "company" | "contact" | "lead";
  entityId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  TODO: {
    label: "To Do",
    icon: <Circle className="h-3 w-3" />,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ON_HOLD: {
    label: "On Hold",
    icon: <PauseCircle className="h-3 w-3" />,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const PRIORITY_CONFIG: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-yellow-50 text-yellow-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-red-50 text-red-700",
};

interface TaskFormState {
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
}

const INITIAL_FORM: TaskFormState = {
  title: "",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: "",
  assignedTo: "",
};

export const EntityTaskList = ({ entityType, entityId }: EntityTaskListProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterKey = `${entityType}Id`;

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["entity-tasks", entityType, entityId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const response = await taskService.getTasks(1, 50, { [filterKey]: entityId });
      return response.data || [];
    },
    enabled: !!currentOrganization && !!entityId,
  });

  const { data: members } = useQuery({
    queryKey: ["organization-members", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const data = await organizationService.getMembers(currentOrganization.id);
      return data.filter((m) => m.user).map((m) => ({
        id: m.user!.id,
        label: m.user!.fullName || m.user!.email,
      }));
    },
    enabled: !!session && !!currentOrganization,
  });

  const tasks: Task[] = tasksData || [];

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const payload: TaskPayload = {
        title: form.title.trim(),
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo || null,
        [`${entityType}Id`]: entityId,
      };
      await taskService.createTask(payload);
      await queryClient.invalidateQueries({ queryKey: ["entity-tasks", entityType, entityId] });
      toast({ title: "Task created" });
      setForm(INITIAL_FORM);
      setDialogOpen(false);
    } catch {
      toast({ title: "Error creating task", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-muted-foreground text-sm">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center border rounded-lg bg-muted/30">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tasks yet</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add the first task
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO;
            const priorityCls = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 h-5 flex items-center gap-1 ${statusCfg.className}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 h-5 ${priorityCls}`}
                    >
                      {task.priority}
                    </Badge>
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User2 className="h-3 w-3" />
                        {task.assignee.fullName || task.assignee.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select
                value={form.assignedTo || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(members || []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
