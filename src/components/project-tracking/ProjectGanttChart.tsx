
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays, addDays, isBefore, isAfter, startOfWeek, endOfWeek, eachDayOfInterval, isValid } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { TaskForm } from "./TaskForm";
import { PhaseForm } from "./PhaseForm";
import { projectService } from "@/services/project.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ProjectPhase, ProjectTask } from '@/types/api';
import { canEditProjects } from '@/constants';

interface ProjectGanttChartProps {
  projectId: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onTasksChange: (tasks: ProjectTask[]) => void;
  onPhasesChange: (phases: ProjectPhase[]) => void;
  userRole?: string | null;
}

export const ProjectGanttChart = ({
  projectId,
  phases,
  tasks,
  onTasksChange,
  onPhasesChange,
  userRole
}: ProjectGanttChartProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [dates, setDates] = useState<Date[]>([]);
  const [visibleStartDate, setVisibleStartDate] = useState<Date | null>(null);
  const [visibleEndDate, setVisibleEndDate] = useState<Date | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPhaseFormOpen, setIsPhaseFormOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<ProjectPhase | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const canEdit = userRole ? canEditProjects(userRole) : false;

  const parseDateString = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const parsedDate = new Date(dateString);
      return isValid(parsedDate) ? parsedDate : null;
    } catch (error) {
      return null;
    }
  };

  const sortedPhases = [...phases].map(phase => ({
    ...phase,
    parsedStartDate: parseDateString(phase.start_date || phase.startDate),
    parsedEndDate: parseDateString(phase.end_date || phase.endDate)
  })).sort((a, b) => {
    if (!a.parsedStartDate) return 1;
    if (!b.parsedStartDate) return -1;
    return a.parsedStartDate.getTime() - b.parsedStartDate.getTime();
  });

  const getTasksByPhase = (phaseId: string) => {
    return tasks.filter(task => (task.phase_id || task.phaseId) === phaseId).sort((a, b) => {
      const aStart = a.start_date || a.startDate;
      const bStart = b.start_date || b.startDate;
      if (!aStart) return 1;
      if (!bStart) return -1;
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });
  };

  // Tasks that are not attached to any phase — render in a dedicated "Unassigned" row
  const unassignedTasks = tasks
    .filter(task => !(task.phase_id || task.phaseId))
    .sort((a, b) => {
      const aStart = a.start_date || a.startDate;
      const bStart = b.start_date || b.startDate;
      if (!aStart) return 1;
      if (!bStart) return -1;
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);

  useEffect(() => {
    if (phases.length === 0 && tasks.length === 0) {
      const today = new Date();
      const startOfToday = startOfWeek(today);
      setVisibleStartDate(startOfToday);
      setVisibleEndDate(addDays(startOfToday, 14));
      return;
    }

    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    for (const phase of phases) {
      const sd = phase.start_date || phase.startDate;
      const ed = phase.end_date || phase.endDate;
      if (sd) {
        const startDate = parseDateString(sd);
        if (startDate && (!earliestDate || isBefore(startDate, earliestDate))) {
          earliestDate = startDate;
        }
      }
      if (ed) {
        const endDate = parseDateString(ed);
        if (endDate && (!latestDate || isAfter(endDate, latestDate))) {
          latestDate = endDate;
        }
      }
    }

    for (const task of tasks) {
      const sd = task.start_date || task.startDate;
      const ed = task.due_date || task.dueDate;
      if (sd) {
        const startDate = parseDateString(sd);
        if (startDate && (!earliestDate || isBefore(startDate, earliestDate))) {
          earliestDate = startDate;
        }
      }
      if (ed) {
        const endDate = parseDateString(ed);
        if (endDate && (!latestDate || isAfter(endDate, latestDate))) {
          latestDate = endDate;
        }
      }
    }

    if (!earliestDate || !latestDate) {
      const today = new Date();
      earliestDate = startOfWeek(today);
      latestDate = addDays(earliestDate, 14);
    }

    if (differenceInDays(latestDate, earliestDate) < 14) {
      latestDate = addDays(earliestDate, 14);
    }

    setVisibleStartDate(earliestDate);
    setVisibleEndDate(latestDate);
  }, [phases, tasks]);

  useEffect(() => {
    if (visibleStartDate && visibleEndDate) {
      const range = eachDayOfInterval({
        start: visibleStartDate,
        end: visibleEndDate
      });
      setDates(range);
    }
  }, [visibleStartDate, visibleEndDate, zoomLevel]);

  const handlePrevPeriod = () => {
    if (!visibleStartDate || !visibleEndDate) return;
    const days = differenceInDays(visibleEndDate, visibleStartDate);
    setVisibleStartDate(addDays(visibleStartDate, -days));
    setVisibleEndDate(addDays(visibleEndDate, -days));
  };

  const handleNextPeriod = () => {
    if (!visibleStartDate || !visibleEndDate) return;
    const days = differenceInDays(visibleEndDate, visibleStartDate);
    setVisibleStartDate(addDays(visibleStartDate, days));
    setVisibleEndDate(addDays(visibleEndDate, days));
  };

  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(zoomLevel + 1);
      if (visibleStartDate && visibleEndDate) {
        const currentDays = differenceInDays(visibleEndDate, visibleStartDate);
        const newEndDate = addDays(visibleStartDate, currentDays * 1.5);
        setVisibleEndDate(newEndDate);
      }
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 1) {
      setZoomLevel(zoomLevel - 1);
      if (visibleStartDate && visibleEndDate) {
        const currentDays = differenceInDays(visibleEndDate, visibleStartDate);
        const newEndDate = addDays(visibleStartDate, currentDays / 1.5);
        setVisibleEndDate(newEndDate);
      }
    }
  };

  const calculateItemPosition = (
    startDate: string | null | undefined,
    endDate: string | null | undefined
  ) => {
    if (!startDate || !visibleStartDate || !visibleEndDate || !dates.length) {
      return { left: 0, width: 0 };
    }

    try {
      const start = parseDateString(startDate);
      const end = endDate ? parseDateString(endDate) : (start ? addDays(start, 1) : null);

      if (!start || !end) {
        return { left: 0, width: 0 };
      }

      const totalDays = differenceInDays(visibleEndDate, visibleStartDate) || 1;
      const startPosition = differenceInDays(start, visibleStartDate);
      const duration = differenceInDays(end, start) || 1;

      const left = (startPosition / totalDays) * 100;
      const width = (duration / totalDays) * 100;

      return {
        left: Math.max(0, Math.min(100, left)),
        width: Math.min(width, 100 - left)
      };
    } catch (error) {
      return { left: 0, width: 0 };
    }
  };

  const getTaskColor = (task: ProjectTask) => {
    switch (task.priority) {
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-green-400';
      default: return 'bg-blue-400';
    }
  };

  const getPhaseColor = () => 'bg-primary/20';

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleEditPhase = (phase: ProjectPhase) => {
    if (!canEdit) return;
    setSelectedPhase(phase);
    setIsPhaseFormOpen(true);
  };

  const handleEditTask = (task: ProjectTask) => {
    if (!canEdit) return;
    setSelectedTask(task);
    setIsTaskFormOpen(true);
  };

  const addNewPhase = () => {
    if (!canEdit) return;
    setSelectedPhase(null);
    setIsPhaseFormOpen(true);
  };

  const toggleCollapsePhase = (phaseId: string) => {
    setCollapsedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const handleDeletePhase = async () => {
    if (!phaseToDelete || !canEdit) return;

    try {
      await projectService.deletePhase(phaseToDelete.id);

      toast({
        title: "Phase deleted",
        description: "The phase has been deleted successfully"
      });

      onPhasesChange(phases.filter(p => p.id !== phaseToDelete.id));

      const updatedTasks = tasks.map(task =>
        (task.phase_id || task.phaseId) === phaseToDelete.id ? { ...task, phase_id: null, phaseId: null } : task
      );
      onTasksChange(updatedTasks);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete phase",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setPhaseToDelete(null);
    }
  };

  const confirmDeletePhase = (phase: ProjectPhase, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setPhaseToDelete(phase);
    setIsDeleteDialogOpen(true);
  };

  const calculatePhaseTimespan = (phaseId: string) => {
    const phaseTasks = getTasksByPhase(phaseId);
    if (phaseTasks.length === 0) return null;

    let earliestStart = null;
    let latestEnd = null;

    for (const task of phaseTasks) {
      const sd = task.start_date || task.startDate;
      const ed = task.due_date || task.dueDate;
      const startDate = sd ? parseDateString(sd) : null;
      const endDate = ed ? parseDateString(ed) : null;

      if (startDate && (!earliestStart || isBefore(startDate, earliestStart))) {
        earliestStart = startDate;
      }
      if (endDate && (!latestEnd || isAfter(endDate, latestEnd))) {
        latestEnd = endDate;
      }
    }

    return { start: earliestStart, end: latestEnd };
  };

  return (
    <div ref={chartContainerRef} className="border rounded-md">
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 py-1">
            {visibleStartDate && visibleEndDate ?
              `${format(visibleStartDate, 'MMM d, yyyy')} - ${format(visibleEndDate, 'MMM d, yyyy')}` :
              'Loading...'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button size="sm" onClick={addNewPhase}>
              <Plus className="h-4 w-4 mr-1" />
              Add Work Area
            </Button>
          )}
        </div>
      </div>

      <div className="gantt-container overflow-x-auto">
        <div className="flex">
          <div className="w-1/4 min-w-[200px] max-w-[300px] border-r">
            <div className="h-10 border-b sticky top-0 bg-background flex items-center px-4 font-medium">
              Task / Phase
            </div>
            {sortedPhases.length === 0 ? (
              <div className="px-4 py-2 text-muted-foreground italic">
                No phases yet. Click "Add Work Area" to create one.
              </div>
            ) : (
              sortedPhases.map((phase) => (
                <div key={phase.id}>
                  <div
                    className="px-4 py-2 border-b font-medium cursor-pointer hover:bg-muted/50 flex justify-between items-center"
                    onClick={() => handleEditPhase(phase)}
                  >
                    <div className="flex items-center flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6 mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapsePhase(phase.id);
                        }}
                      >
                        {collapsedPhases[phase.id] ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {phase.name}
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6 opacity-50 hover:opacity-100 hover:bg-destructive/10"
                        onClick={(e) => confirmDeletePhase(phase, e)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {!collapsedPhases[phase.id] && getTasksByPhase(phase.id).map((task) => (
                    <div
                      key={task.id}
                      className="px-4 py-2 border-b pl-8 text-sm cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditTask(task)}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              ))
            )}

            {unassignedTasks.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b font-medium flex items-center bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-6 w-6 mr-2"
                    onClick={() => setUnassignedCollapsed(c => !c)}
                  >
                    {unassignedCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <span className="text-muted-foreground italic">Unassigned ({unassignedTasks.length})</span>
                </div>
                {!unassignedCollapsed && unassignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-4 py-2 border-b pl-8 text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditTask(task)}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <div className="flex border-b h-10 sticky top-0 bg-background">
              {dates.map((date, index) => (
                <div
                  key={index}
                  className={`text-center text-xs flex-1 py-2 border-r ${isWeekend(date) ? 'bg-muted/30' : ''}`}
                  style={{ minWidth: '40px' }}
                >
                  <div>{format(date, 'EEE')}</div>
                  <div>{format(date, 'd')}</div>
                </div>
              ))}
            </div>

            <div className="relative">
              {sortedPhases.map((phase) => {
                const psd = phase.start_date || phase.startDate;
                const ped = phase.end_date || phase.endDate;
                return (
                <div key={phase.id}>
                  <div className="relative h-10 border-b">
                    {psd && ped && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute h-6 top-2 rounded ${getPhaseColor()} cursor-pointer`}
                            style={{
                              left: `${calculateItemPosition(psd, ped).left}%`,
                              width: `${calculateItemPosition(psd, ped).width}%`,
                            }}
                            onClick={() => handleEditPhase(phase)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm font-medium">{phase.name}</div>
                          <div className="text-xs">
                            {psd && format(new Date(psd), 'MMM d, yyyy')} -
                            {ped && format(new Date(ped), 'MMM d, yyyy')}
                          </div>
                          {phase.description && (
                            <div className="text-xs max-w-xs">{phase.description}</div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {!collapsedPhases[phase.id] ? (
                    getTasksByPhase(phase.id).map((task) => {
                      const tsd = task.start_date || task.startDate;
                      const ted = task.due_date || task.dueDate;
                      return (
                      <div key={task.id} className="relative h-10 border-b">
                        {tsd && ted && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-4 top-3 rounded ${getTaskColor(task)} cursor-pointer`}
                                style={{
                                  left: `${calculateItemPosition(tsd, ted).left}%`,
                                  width: `${calculateItemPosition(tsd, ted).width}%`,
                                }}
                                onClick={() => handleEditTask(task)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm font-medium">{task.title}</div>
                              <div className="text-xs">
                                {tsd && format(new Date(tsd), 'MMM d, yyyy')} -
                                {ted && format(new Date(ted), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs flex gap-2 mt-1">
                                <Badge variant="outline">{task.status}</Badge>
                                {task.priority && (
                                  <Badge>{task.priority}</Badge>
                                )}
                              </div>
                              {task.description && (
                                <div className="text-xs max-w-xs mt-1">{task.description}</div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                    })
                  ) : (
                    (() => {
                      const timespan = calculatePhaseTimespan(phase.id);
                      const phaseTasks = getTasksByPhase(phase.id);

                      if (!timespan || !timespan.start || !timespan.end || phaseTasks.length === 0) {
                        return null;
                      }

                      return (
                        <div className="relative h-10 border-b">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute h-4 top-3 rounded bg-blue-400 cursor-pointer"
                                style={{
                                  left: `${calculateItemPosition(timespan.start.toISOString(), timespan.end.toISOString()).left}%`,
                                  width: `${calculateItemPosition(timespan.start.toISOString(), timespan.end.toISOString()).width}%`,
                                }}
                                onClick={() => toggleCollapsePhase(phase.id)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm font-medium">{phase.name} Tasks</div>
                              <div className="text-xs">
                                {format(timespan.start, 'MMM d, yyyy')} - {format(timespan.end, 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs mt-1">
                                Contains {phaseTasks.length} task{phaseTasks.length !== 1 ? 's' : ''}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })()
                  )}
                </div>
              );
              })}

              {unassignedTasks.length > 0 && (
                <div>
                  {/* Header row to mirror the left column's "Unassigned" header */}
                  <div className="relative h-10 border-b bg-muted/30" />
                  {!unassignedCollapsed && unassignedTasks.map((task) => {
                    const tsd = task.start_date || task.startDate;
                    const ted = task.due_date || task.dueDate;
                    return (
                      <div key={task.id} className="relative h-10 border-b">
                        {tsd && ted && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-4 top-3 rounded ${getTaskColor(task)} cursor-pointer`}
                                style={{
                                  left: `${calculateItemPosition(tsd, ted).left}%`,
                                  width: `${calculateItemPosition(tsd, ted).width}%`,
                                }}
                                onClick={() => handleEditTask(task)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm font-medium">{task.title}</div>
                              <div className="text-xs">
                                {tsd && format(new Date(tsd), 'MMM d, yyyy')} -
                                {ted && format(new Date(ted), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs flex gap-2 mt-1">
                                <Badge variant="outline">{task.status}</Badge>
                                {task.priority && <Badge>{task.priority}</Badge>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPhaseFormOpen} onOpenChange={setIsPhaseFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPhase ? 'Edit Phase' : 'Add Work Area'}</DialogTitle>
          </DialogHeader>
          <PhaseForm
            projectId={projectId}
            initialData={selectedPhase}
            onSuccess={() => {
              toast({
                title: "Success",
                description: `Phase ${selectedPhase ? 'updated' : 'created'} successfully`
              });
              setIsPhaseFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={projectId}
            phases={phases}
            initialData={selectedTask}
            onSuccess={() => {
              toast({
                title: "Success",
                description: `Task ${selectedTask ? 'updated' : 'created'} successfully`
              });
              setIsTaskFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeletePhase}
        title="Delete Phase"
        description={`Are you sure you want to delete the phase "${phaseToDelete?.name}"? This will remove the phase but not its tasks.`}
      />

      <style>
        {`
          .gantt-container {
            max-height: calc(100vh - 250px);
            overflow-y: auto;
          }
        `}
      </style>
    </div>
  );
};
