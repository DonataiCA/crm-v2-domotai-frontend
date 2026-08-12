
import { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  User2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  Pencil,
  Trash2,
  Layers,
  Eye,
  CheckCircle2,
  Tag as TagIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { projectService } from "@/services/project.service";
import { tagService } from "@/services/tag.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { TaskForm } from "./TaskForm";
import { PhaseForm } from "./PhaseForm";
import { TaskCommentSection } from "./TaskCommentSection";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ProjectPhase, ProjectTask, Tag } from '@/types/api';
import { TASK_STATUS_OPTIONS, canEditProjects, getPriorityBgColor, isClientRole } from '@/constants';

interface ProjectKanbanBoardProps {
  projectId: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onTasksChange: (tasks: ProjectTask[]) => void;
  onPhasesChange: (phases: ProjectPhase[]) => void;
  onRefresh?: () => void;
  userRole?: string | null;
  initialViewingTaskId?: string;
}

export const ProjectKanbanBoard = ({
  projectId,
  phases,
  tasks,
  onTasksChange,
  onPhasesChange,
  onRefresh,
  userRole,
  initialViewingTaskId,
}: ProjectKanbanBoardProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { session } = useAuth();
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null);
  const openedFromUrlRef = useRef<string | null>(null);

  // Keep viewingTask in sync with the fresh tasks array so comments/tags/etc.
  // re-render after mutations without needing to close & reopen the modal.
  useEffect(() => {
    if (!viewingTask) return;
    const fresh = tasks.find(t => t.id === viewingTask.id);
    if (fresh && fresh !== viewingTask) {
      setViewingTask(fresh);
    }
  }, [tasks, viewingTask]);

  // Auto-open task from URL (?taskId=). Runs once per initialViewingTaskId value
  // so manually closing the modal doesn't re-open it.
  useEffect(() => {
    if (!initialViewingTaskId) return;
    if (openedFromUrlRef.current === initialViewingTaskId) return;
    if (tasks.length === 0) return;
    const found = tasks.find(t => t.id === initialViewingTaskId);
    if (found) {
      setViewingTask(found);
      openedFromUrlRef.current = initialViewingTaskId;
    }
  }, [initialViewingTaskId, tasks]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'phase' | 'task', id: string, name: string } | null>(null);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const phaseIdForNewTask = useRef<string | null>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string[]>([]);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: tagService.getAll,
  });

  const isTeam = canEditProjects(userRole);
  const isClient = isClientRole(userRole);
  const canEdit = isTeam || isClient;

  const statusColumns = TASK_STATUS_OPTIONS.map(opt => ({ id: opt.value, label: opt.label }));

  const sortedPhases = [...phases].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  const getTasksByStatus = (status: string) => {
    return tasks
      .filter(task => {
        if (task.status !== status) return false;
        if (selectedPhaseFilter && (task as any).phase_id !== selectedPhaseFilter && task.phaseId !== selectedPhaseFilter) return false;
        if (selectedTagFilter.length > 0) {
          const taskTagIds = (task.taskTags || []).map(tt => tt.tag?.id || tt.tagId);
          if (!selectedTagFilter.some(tagId => taskTagIds.includes(tagId))) return false;
        }
        return true;
      })
      .sort((a, b) => ((a as any).order_index || a.orderIndex || 0) - ((b as any).order_index || b.orderIndex || 0));
  };

  const getPhaseNameForTask = (task: ProjectTask) => {
    const pid = (task as any).phase_id || task.phaseId;
    if (!pid) return null;
    const phase = phases.find(p => p.id === pid);
    return phase ? phase.name : null;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !canEdit) return;

    const { source, destination, draggableId, type } = result;

    if (type === 'task') {
      const updatedTasks = [...tasks];
      const taskIndex = updatedTasks.findIndex(t => t.id === draggableId);

      if (taskIndex === -1) return;

      const task = { ...updatedTasks[taskIndex] };
      const newStatus = destination.droppableId;
      task.status = newStatus;

      if (newStatus === 'COMPLETED' && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      }

      if (newStatus !== 'COMPLETED') {
        task.completedAt = null;
      }

      updatedTasks.splice(taskIndex, 1);
      updatedTasks.splice(destination.index, 0, task);

      try {
        await projectService.updateProjectTask(task.id, {
          status: task.status,
          completedAt: task.completedAt
        });

        onTasksChange(updatedTasks);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to update task status',
          variant: 'destructive'
        });
      }
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || !canEdit) return;

    try {
      if (itemToDelete.type === 'phase') {
        await projectService.deletePhase(itemToDelete.id);
        onPhasesChange(phases.filter(p => p.id !== itemToDelete.id));
        onTasksChange(tasks.map(t => t.phaseId === itemToDelete.id ? { ...t, phaseId: null, phase: null } : t));
        toast({ title: 'Work area deleted' });
      } else {
        await projectService.deleteProjectTask(itemToDelete.id);
        onTasksChange(tasks.filter(t => t.id !== itemToDelete.id));
        toast({ title: 'Task deleted' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete ${itemToDelete.type}`,
        variant: 'destructive'
      });
    } finally {
      setIsConfirmDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  const handleAddTask = (phaseId: string | null) => {
    phaseIdForNewTask.current = phaseId;
    setIsAddTaskDialogOpen(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await projectService.updateProjectTask(taskId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
      });

      const updatedTasks = tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: 'COMPLETED',
              completedAt: new Date().toISOString()
            }
          : task
      );

      onTasksChange(updatedTasks);

      toast({
        title: 'Task Completed',
        description: 'Task has been marked as completed'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive'
      });
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Work Areas</h3>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedPhaseFilter === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedPhaseFilter(null)}
            >
              All Areas
            </Badge>
            {sortedPhases.map(phase => (
              <div key={phase.id} className="group relative inline-flex">
                <Badge
                  variant={selectedPhaseFilter === phase.id ? "default" : "outline"}
                  className="cursor-pointer pr-6"
                  onClick={() => setSelectedPhaseFilter(phase.id === selectedPhaseFilter ? null : phase.id)}
                >
                  {phase.name}
                </Badge>
                {isTeam && (
                  <button
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete({ type: 'phase', id: phase.id, name: phase.name });
                      setIsConfirmDeleteOpen(true);
                    }}
                    title={`Delete ${phase.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {canEdit && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Work Area
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Phase</DialogTitle>
              </DialogHeader>
              <PhaseForm
                projectId={projectId}
                onSuccess={() => {
                  toast({ title: "Success", description: "Phase created successfully" });
                  onRefresh?.();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5" />
            Filter by Tag
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedTagFilter.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer text-xs transition-all"
                style={selectedTagFilter.includes(tag.id) ? { backgroundColor: tag.color || '#4A89B9' } : {}}
                onClick={() => setSelectedTagFilter(prev =>
                  prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                )}
              >
                <span className="h-2 w-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: tag.color || '#64748b' }} />
                {tag.name}
              </Badge>
            ))}
            {selectedTagFilter.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setSelectedTagFilter([])}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusColumns.map(column => (
            <div key={column.id} className="bg-muted/50 rounded-md p-3 min-h-[50vh]">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-medium">{column.label}</h3>
                  <div className="text-xs text-muted-foreground">
                    {getTasksByStatus(column.id).length} tasks
                  </div>
                </div>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddTask(null)}
                    className="h-8 w-8 p-0"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Droppable droppableId={column.id} type="task">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 min-h-[100px]"
                  >
                    {getTasksByStatus(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-2 shadow-sm"
                          >
                            <CardHeader className="p-3 pb-1 flex flex-row justify-between items-start">
                              <h4 className="font-medium text-sm">{task.title}</h4>
                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    {isTeam && (
                                      <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                          setItemToDelete({
                                            type: 'task',
                                            id: task.id,
                                            name: task.title
                                          });
                                          setIsConfirmDeleteOpen(true);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                              <div className="flex flex-wrap gap-1 mt-1 mb-2">
                                {task.priority && (
                                  <Badge
                                    variant="secondary"
                                    className={`text-white ${getPriorityBgColor(task.priority)}`}
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                                {getPhaseNameForTask(task) && (
                                  <Badge variant="outline" className="flex items-center text-xs">
                                    <Layers className="h-3 w-3 mr-1" />
                                    {getPhaseNameForTask(task)}
                                  </Badge>
                                )}
                              </div>
                              {/* Tag chips */}
                              {(task.taskTags?.length || 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {task.taskTags!.map(tt => (
                                    <span
                                      key={tt.tagId || tt.tag?.id}
                                      className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none"
                                      style={{
                                        backgroundColor: (tt.tag?.color || '#64748b') + '18',
                                        color: tt.tag?.color || '#64748b',
                                        border: `1px solid ${(tt.tag?.color || '#64748b') + '30'}`,
                                      }}
                                    >
                                      {tt.tag?.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {task.dueDate && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                                </div>
                              )}
                              {task.assignee?.fullName && (
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <User2Icon className="h-3 w-3 mr-1" />
                                  {task.assignee.fullName}
                                </div>
                              )}
                              {/* Conclusion indicator */}
                              {task.status === 'COMPLETED' && task.conclusion && (
                                <div className="flex items-center text-[11px] text-emerald-600 mt-1" title="Conclusion documented">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Concluded
                                </div>
                              )}
                              <div className="flex gap-1 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 flex-1 text-xs"
                                  onClick={() => setViewingTask(task)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                                {column.id !== 'COMPLETED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 flex-1 text-xs"
                                    onClick={() => handleCompleteTask(task.id)}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {editingPhase && (
        <Dialog open={true} onOpenChange={(open) => !open && setEditingPhase(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Phase</DialogTitle>
            </DialogHeader>
            <PhaseForm
              projectId={projectId}
              initialData={editingPhase}
              onSuccess={() => {
                toast({ title: "Success", description: "Phase updated successfully" });
                setEditingPhase(null);
                onRefresh?.();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {editingTask && (
        <Dialog open={true} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              projectId={projectId}
              phases={phases}
              initialData={editingTask}
              onSuccess={() => {
                toast({ title: "Success", description: "Task updated successfully" });
                setEditingTask(null);
                onRefresh?.();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={projectId}
            phases={phases}
            initialData={{
              phaseId: phaseIdForNewTask.current,
              status: 'TODO'
            }}
            onSuccess={() => {
              toast({ title: "Success", description: "Task created successfully" });
              setIsAddTaskDialogOpen(false);
              onRefresh?.();
            }}
          />
        </DialogContent>
      </Dialog>

      {viewingTask && (
        <Dialog open={true} onOpenChange={(open) => !open && setViewingTask(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewingTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingTask.description && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline">{viewingTask.status}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Priority</p>
                  {viewingTask.priority && (
                    <Badge className={`text-white ${getPriorityBgColor(viewingTask.priority)}`}>
                      {viewingTask.priority}
                    </Badge>
                  )}
                </div>
                {getPhaseNameForTask(viewingTask) && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Work Area</p>
                    <div className="flex items-center text-sm">
                      <Layers className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      {getPhaseNameForTask(viewingTask)}
                    </div>
                  </div>
                )}
                {viewingTask.assignee?.fullName && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Assigned To</p>
                    <div className="flex items-center text-sm">
                      <User2Icon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      {viewingTask.assignee.fullName}
                    </div>
                  </div>
                )}
                {viewingTask.dueDate && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Due Date</p>
                    <div className="flex items-center text-sm">
                      <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      {format(parseISO(viewingTask.dueDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
                {viewingTask.startDate && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Start Date</p>
                    <div className="flex items-center text-sm">
                      <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      {format(parseISO(viewingTask.startDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>
              {/* Tags */}
              {(viewingTask.taskTags?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingTask.taskTags!.map(tt => (
                      <Badge key={tt.tag?.id} variant="outline" className="text-xs" style={{ borderColor: tt.tag?.color || '#64748b', color: tt.tag?.color || '#64748b' }}>
                        <span className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: tt.tag?.color || '#64748b' }} />
                        {tt.tag?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* Conclusion */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Conclusion</p>
                {viewingTask.conclusion ? (
                  <p className="text-sm whitespace-pre-wrap">{viewingTask.conclusion}</p>
                ) : viewingTask.status === 'COMPLETED' ? (
                  <p className="text-sm text-amber-600/80 italic">No conclusion documented — consider adding one for traceability.</p>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">Will be filled when the task is completed.</p>
                )}
              </div>
              {viewingTask.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Created {format(parseISO(viewingTask.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              )}
              {/* Comments */}
              <TaskCommentSection
                taskId={viewingTask.id}
                comments={viewingTask.comments || []}
                onCommentsChange={() => onRefresh?.()}
              />

              {canEdit && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setViewingTask(null); setEditingTask(viewingTask); }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Task
                  </Button>
                  {viewingTask.status !== 'COMPLETED' && (
                    <Button
                      className="flex-1"
                      onClick={() => { handleCompleteTask(viewingTask.id); setViewingTask(null); }}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        title={`Delete ${itemToDelete?.type === 'phase' ? 'Phase' : 'Task'}`}
        description={`Are you sure you want to delete ${itemToDelete?.name}? This action cannot be undone.`}
        onConfirm={handleDeleteItem}
      />
    </div>
  );
};
