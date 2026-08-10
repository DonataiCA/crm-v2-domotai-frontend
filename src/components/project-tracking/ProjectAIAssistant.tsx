import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { aiService } from "@/services/ai.service";
import { projectService } from "@/services/project.service";
import { TaskAssignmentModal } from "@/components/tasks/TaskAssignmentModal";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Bot,
  Loader2,
  Zap,
  Plus,
  AlertCircle
} from "lucide-react";
import type { Project, ProjectPhase, ProjectTask } from '@/types/api';
import { getPriorityBadgeVariant } from '@/constants';

interface GeneratedTask {
  title: string;
  description: string;
  status: string;
  priority: string;
  phase_id: string;
  assigned_to?: string;
  start_date?: string;
  due_date?: string;
  order_index: number;
}

interface ProjectAIAssistantProps {
  projectId: string;
  project: Project;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onTasksRefresh?: () => void;
}

export const ProjectAIAssistant = ({
  projectId,
  project,
  phases,
  tasks,
  onTasksRefresh
}: ProjectAIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string>>({});
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const { currentOrganization } = useOrganization();

  const generateTasks = async () => {
    if (isLoading) return;

    if (!project?.prd || project.prd.trim() === "") {
      toast({
        title: "Error",
        description: "Project must have a PRD (Product Requirements Document) to generate tasks.",
        variant: "destructive",
      });
      return;
    }

    if (!phases || phases.length === 0) {
      toast({
        title: "Error",
        description: "Project must have phases defined to generate tasks.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const data = await aiService.generateTasks(
        projectId,
        phases.map(phase => ({
          id: phase.id,
          name: phase.name,
          description: phase.description,
          status: phase.status
        }))
      );

      // Backend already creates tasks in DB and returns them
      const count = data.generated || data.tasks?.length || 0;

      if (count === 0) {
        toast({
          title: "No Tasks Generated",
          description: "AI couldn't generate tasks. Refine your PRD.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Tasks Generated!",
        description: `${count} tasks created across your work areas.`,
      });

      // Close the sheet and refresh parent data
      setIsOpen(false);
      onTasksRefresh?.();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTasks = () => {
    if (generatedTasks.length > 0) {
      setShowAssignmentModal(true);
    }
  };

  const handleCreateTasksWithAssignments = async () => {
    setIsCreatingTasks(true);
    try {
      for (let i = 0; i < generatedTasks.length; i++) {
        const task = generatedTasks[i];
        const assignedTo = taskAssignments[i.toString()] || task.assigned_to;

        const statusMap: Record<string, string> = {
          to_do: 'TODO', todo: 'TODO', in_progress: 'IN_PROGRESS',
          completed: 'COMPLETED', on_hold: 'ON_HOLD',
        };
        const priorityMap: Record<string, string> = {
          low: 'LOW', medium: 'MEDIUM', high: 'HIGH', urgent: 'URGENT',
        };

        await projectService.createProjectTask(projectId, {
          title: task.title,
          description: task.description,
          status: statusMap[task.status?.toLowerCase()] || task.status?.toUpperCase() || 'TODO',
          priority: priorityMap[task.priority?.toLowerCase()] || task.priority?.toUpperCase() || 'MEDIUM',
          phaseId: task.phase_id,
          assignedTo: assignedTo,
          startDate: task.start_date,
          dueDate: task.due_date,
          orderIndex: task.order_index,
        });
      }

      toast({
        title: "Success",
        description: `Created ${generatedTasks.length} tasks successfully!`,
      });

      setGeneratedTasks([]);
      setTaskAssignments({});
      setShowAssignmentModal(false);
      setIsOpen(false);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create some tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTasks(false);
    }
  };


  const getPhaseNameById = (phaseId: string) => {
    const phase = phases?.find(p => p.id === phaseId);
    return phase?.name || 'Unknown Phase';
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 bg-secondary border border-border hover:bg-secondary/80"
          data-ai-assistant-trigger
        >
          <Bot className="h-6 w-6 text-secondary-foreground" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[500px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Task Generator
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Generate tasks automatically for {project?.name || 'your project'}
          </p>
        </SheetHeader>

        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Zap className="h-12 w-12 mx-auto text-primary opacity-70" />
              <h3 className="text-lg font-semibold">Generate Project Tasks</h3>
              <p className="text-sm text-muted-foreground">
                AI will analyze your PRD and project phases to create relevant tasks
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {project?.prd ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    PRD Available
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    PRD Required
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {phases && phases.length > 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {phases.length} Phases Defined
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Phases Required
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={generateTasks}
              disabled={isLoading || !project?.prd || !phases?.length}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Tasks...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Tasks
                </>
              )}
            </Button>
          </div>

          {generatedTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Generated Tasks ({generatedTasks.length})</h4>
                <Button
                  size="sm"
                  onClick={handleCreateTasks}
                  disabled={isCreatingTasks}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Create Tasks
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {generatedTasks.map((task, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-background">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">{task.title}</h5>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getPhaseNameById(task.phase_id)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      <TaskAssignmentModal
        open={showAssignmentModal}
        onOpenChange={setShowAssignmentModal}
        tasks={generatedTasks}
        onAssignmentsChange={setTaskAssignments}
        onSave={handleCreateTasksWithAssignments}
      />
    </Sheet>
  );
};
