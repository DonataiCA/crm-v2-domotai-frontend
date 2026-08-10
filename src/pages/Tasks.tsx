
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskViewToggle } from "@/components/tasks/TaskViewToggle";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskTableView } from "@/components/tasks/TaskTableView";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { TaskSortControls } from "@/components/tasks/TaskSortControls";
import { CompletedTasksArchive } from "@/components/tasks/CompletedTasksArchive";
import { useToast } from "@/hooks/use-toast";
import { taskService } from "@/services/task.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

const Tasks = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { userRole } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [view, setView] = useState<'cards' | 'table' | 'kanban'>('cards');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("due_date");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ["tasks", filterStatus, filterUser, currentOrganization?.id, sortBy, sortOrder],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      const filters: Record<string, string> = {};
      if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
      if (filterUser && filterUser !== "all" && filterUser !== "unassigned") {
        filters.assignedTo = filterUser;
      }

      const sortFieldMap: Record<string, string> = {
        due_date: 'dueDate',
        created_at: 'createdAt',
        assigned_to: 'assignedTo',
        priority: 'priority',
      };
      const backendSortBy = sortFieldMap[sortBy] || sortBy;

      const response = await taskService.getTasks(1, 500, filters, backendSortBy, sortOrder);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const handleTaskComplete = async (taskId: string) => {
    try {
      if (!currentOrganization?.id) throw new Error("No organization selected");
      await taskService.updateTask(taskId, { status: 'COMPLETED' });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task completed", description: "The task has been marked as completed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    }
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const allTasks = tasksData || [];
  const completedCount = useMemo(() => allTasks.filter((t) => t.status === "COMPLETED").length, [allTasks]);
  const tasks = allTasks;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          {currentOrganization && (
            <p className="text-muted-foreground">{currentOrganization.name}</p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <TaskForm
                onSuccess={() => {
                  toast({ title: "Success", description: "Task created successfully" });
                  setOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-3 min-w-0 overflow-x-auto">
        <TaskFilters
          filterStatus={filterStatus}
          filterUser={filterUser}
          onStatusChange={setFilterStatus}
          onUserChange={setFilterUser}
        />
        <TaskSortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      {/* View toggle row */}
      <div className="flex items-center gap-1 mb-6">
        <TaskViewToggle
          view={view}
          onViewChange={setView}
          completedCount={completedCount}
          onOpenArchive={() => setArchiveOpen(true)}
        />
      </div>

      {!currentOrganization ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No Organization Selected</h3>
          <p className="text-muted-foreground mb-4">Please select an organization to view tasks.</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
          <h3 className="text-lg font-medium mb-2">Error Loading Tasks</h3>
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}>Retry</Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
          <p className="text-muted-foreground">
            {filterStatus !== "all" || filterUser !== "all"
              ? "Try changing your filters to see more tasks."
              : "Create a new task to get started."}
          </p>
        </div>
      ) : (
        view === 'cards' ? (
          <TaskListView
            tasks={tasks}
            userRole={userRole}
            onTaskComplete={handleTaskComplete}
            showOldCompletedTasks={false}
          />
        ) : view === 'table' ? (
          <TaskTableView
            tasks={tasks}
            userRole={userRole}
            onTaskComplete={handleTaskComplete}
            showOldCompletedTasks={false}
          />
        ) : (
          <TaskKanbanBoard
            tasks={tasks}
            userRole={userRole}
            onTaskComplete={handleTaskComplete}
            showOldCompletedTasks={false}
          />
        )
      )}

      <CompletedTasksArchive
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        tasks={allTasks}
        userRole={userRole}
      />
    </>
  );
};

export default Tasks;
