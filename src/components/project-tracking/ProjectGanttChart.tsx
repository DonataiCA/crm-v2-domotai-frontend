
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
import { canEditProjects, TaskStatus } from '@/constants';

// Bounds for the timeline window, in days. Zooming scales the window by ZOOM_STEP.
const MIN_VISIBLE_DAYS = 7;
const MAX_VISIBLE_DAYS = 31;
const ZOOM_STEP = 1.5;

// Width reserved at a bar's right edge for the continuation dots, in px.
const CONTINUATION_TAIL_PX = 22;

// Paints a bar's body. When the item runs past the right edge of the visible window the bar
// stops short and hands its tail to three dots painted with the very same colour class, so the
// timeline reads as continuing. Both parts live inside the bar's box — which clips its own
// overflow — so the dots never add width to the row.
const BarFill = ({
  colorClass,
  continuesAfter
}: {
  colorClass: string;
  continuesAfter: boolean;
}) => (
  <>
    <div
      className={`absolute inset-y-0 left-0 rounded ${colorClass}`}
      style={{ right: continuesAfter ? CONTINUATION_TAIL_PX : 0 }}
    />
    {continuesAfter && (
      <div className="absolute inset-y-0 right-0.5 flex items-center gap-[3px]">
        <span className={`h-1 w-1 rounded-full ${colorClass}`} />
        <span className={`h-1 w-1 rounded-full ${colorClass}`} />
        <span className={`h-1 w-1 rounded-full ${colorClass}`} />
      </div>
    )}
  </>
);

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

  // Share of the phase's tasks that are completed. Returns null when the phase has no tasks,
  // since 0/0 has no meaningful percentage to show.
  const getPhaseProgress = (phaseId: string) => {
    const phaseTasks = getTasksByPhase(phaseId);
    if (phaseTasks.length === 0) return null;

    const completed = phaseTasks.filter(
      task => (task.status || '').toUpperCase() === TaskStatus.COMPLETED
    ).length;

    return {
      completed,
      total: phaseTasks.length,
      percent: Math.round((completed / phaseTasks.length) * 100),
    };
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
  }, [visibleStartDate, visibleEndDate]);

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

  // Number of days currently spanned by the timeline. Zooming just resizes this window.
  const visibleDays = visibleStartDate && visibleEndDate
    ? differenceInDays(visibleEndDate, visibleStartDate)
    : 0;

  const applyVisibleDays = (days: number) => {
    if (!visibleStartDate) return;
    const clamped = Math.round(
      Math.min(MAX_VISIBLE_DAYS, Math.max(MIN_VISIBLE_DAYS, days))
    );
    setVisibleEndDate(addDays(visibleStartDate, clamped));
  };

  // Zoom in => fewer days on screen (more detail per day).
  const handleZoomIn = () => applyVisibleDays(visibleDays / ZOOM_STEP);

  // Zoom out => more days on screen.
  const handleZoomOut = () => applyVisibleDays(visibleDays * ZOOM_STEP);

  const HIDDEN_ITEM = { visible: false, left: 0, width: 0, continuesAfter: false };

  const calculateItemPosition = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    // Range the item may not paint outside of. Tasks pass their phase's dates here so a task
    // whose own dates run past the phase stays contained within the phase's band.
    bounds?: { start: string | null | undefined; end: string | null | undefined }
  ) => {
    if (!startDate || !visibleStartDate || !visibleEndDate || !dates.length) {
      return HIDDEN_ITEM;
    }

    try {
      let start = parseDateString(startDate);
      let end = endDate ? parseDateString(endDate) : (start ? addDays(start, 1) : null);

      if (!start || !end) {
        return HIDDEN_ITEM;
      }

      let clampedByBounds = false;
      if (bounds) {
        const boundStart = parseDateString(bounds.start);
        const boundEnd = parseDateString(bounds.end);

        if (boundStart && isBefore(start, boundStart)) start = boundStart;
        if (boundEnd && isAfter(end, boundEnd)) {
          end = boundEnd;
          clampedByBounds = true;
        }

        // Clamping crossed the edges over each other: the item lies fully outside its bounds.
        if (isAfter(start, end)) {
          return HIDDEN_ITEM;
        }
      }

      const totalDays = differenceInDays(visibleEndDate, visibleStartDate) || 1;
      const startOffset = differenceInDays(start, visibleStartDate);
      const endOffset = startOffset + (differenceInDays(end, start) || 1);

      // Nothing of this item falls inside the window — don't render it at all.
      if (endOffset <= 0 || startOffset >= totalDays) {
        return HIDDEN_ITEM;
      }

      // Clip both edges to the window before turning them into percentages. Clamping only the
      // left (and deriving the width from the unclamped value) let items starting before the
      // window render wider than 100%, overflowing the row and stretching the horizontal
      // scroll into a phantom column.
      const clippedStart = Math.max(0, startOffset);
      const clippedEnd = Math.min(totalDays, endOffset);

      return {
        visible: true,
        left: (clippedStart / totalDays) * 100,
        width: ((clippedEnd - clippedStart) / totalDays) * 100,
        // Dots mark a bar cut short, whether by the visible window or by its phase's end.
        continuesAfter: endOffset > totalDays || clampedByBounds
      };
    } catch (error) {
      return HIDDEN_ITEM;
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={visibleDays >= MAX_VISIBLE_DAYS}
            title="Show more days"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={visibleDays <= MIN_VISIBLE_DAYS}
            title="Show fewer days"
          >
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
        {/* min-w-max keeps this row as wide as the whole timeline, so the sticky left column
            stays pinned across the full horizontal scroll instead of detaching at 100% width. */}
        <div className="flex min-w-max">
          <div className="w-1/4 min-w-[200px] max-w-[300px] shrink-0 border-r sticky left-0 z-30 bg-background">
            <div className="h-10 border-b sticky top-0 z-20 bg-background flex items-center px-4 font-medium">
              Task / Phase
            </div>
            {sortedPhases.length === 0 ? (
              <div className="h-10 border-b flex items-center px-4 text-muted-foreground italic truncate">
                No phases yet. Click "Add Work Area" to create one.
              </div>
            ) : (
              sortedPhases.map((phase) => {
                const progress = getPhaseProgress(phase.id);
                return (
                <div key={phase.id}>
                  <div
                    className="h-10 px-4 border-b font-medium cursor-pointer hover:bg-muted/50 flex justify-between items-center gap-2"
                    onClick={() => handleEditPhase(phase)}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6 mr-2 shrink-0"
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
                      <span className="truncate">{phase.name}</span>
                    </div>
                    {progress && (
                      <span
                        className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground"
                        title={`${progress.completed} of ${progress.total} tasks completed`}
                      >
                        {progress.percent}%
                      </span>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6 shrink-0 opacity-50 hover:opacity-100 hover:bg-destructive/10"
                        onClick={(e) => confirmDeletePhase(phase, e)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {!collapsedPhases[phase.id] && getTasksByPhase(phase.id).map((task) => (
                    <div
                      key={task.id}
                      className="h-10 px-4 pl-8 border-b flex items-center text-sm cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditTask(task)}
                    >
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
                );
              })
            )}

            {unassignedTasks.length > 0 && (
              <div>
                <div className="h-10 px-4 border-b font-medium flex items-center bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-6 w-6 mr-2 shrink-0"
                    onClick={() => setUnassignedCollapsed(c => !c)}
                  >
                    {unassignedCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <span className="text-muted-foreground italic truncate">Unassigned ({unassignedTasks.length})</span>
                </div>
                {!unassignedCollapsed && unassignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="h-10 px-4 pl-8 border-b flex items-center text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditTask(task)}
                  >
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <div className="flex border-b h-10 sticky top-0 z-20 bg-background">
              {dates.map((date, index) => (
                <div
                  key={index}
                  className={`flex-1 h-10 border-r flex flex-col items-center justify-center leading-tight text-center text-xs ${isWeekend(date) ? 'bg-muted/30' : ''}`}
                  style={{ minWidth: '40px' }}
                >
                  <div>{format(date, 'EEE')}</div>
                  <div>{format(date, 'd')}</div>
                </div>
              ))}
            </div>

            <div className="relative">
              {sortedPhases.length === 0 && (
                <div className="relative h-10 border-b" />
              )}
              {sortedPhases.map((phase) => {
                const psd = phase.start_date || phase.startDate;
                const ped = phase.end_date || phase.endDate;
                const phasePos = calculateItemPosition(psd, ped);
                return (
                <div key={phase.id}>
                  <div className="relative h-10 border-b">
                    {psd && ped && phasePos.visible && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute h-6 top-2 rounded overflow-hidden cursor-pointer"
                            style={{
                              left: `${phasePos.left}%`,
                              width: `${phasePos.width}%`,
                            }}
                            onClick={() => handleEditPhase(phase)}
                          >
                            <BarFill
                              colorClass={getPhaseColor()}
                              continuesAfter={phasePos.continuesAfter}
                            />
                          </div>
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

                  {!collapsedPhases[phase.id] && (
                    getTasksByPhase(phase.id).map((task) => {
                      const tsd = task.start_date || task.startDate;
                      const ted = task.due_date || task.dueDate;
                      // Constrained to the phase's own range: a task never paints outside it.
                      const taskPos = calculateItemPosition(tsd, ted, { start: psd, end: ped });
                      return (
                      <div key={task.id} className="relative h-10 border-b">
                        {tsd && ted && taskPos.visible && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute h-4 top-3 rounded overflow-hidden cursor-pointer"
                                style={{
                                  left: `${taskPos.left}%`,
                                  width: `${taskPos.width}%`,
                                }}
                                onClick={() => handleEditTask(task)}
                              >
                                <BarFill
                                  colorClass={getTaskColor(task)}
                                  continuesAfter={taskPos.continuesAfter}
                                />
                              </div>
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
                    const taskPos = calculateItemPosition(tsd, ted);
                    return (
                      <div key={task.id} className="relative h-10 border-b">
                        {tsd && ted && taskPos.visible && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute h-4 top-3 rounded overflow-hidden cursor-pointer"
                                style={{
                                  left: `${taskPos.left}%`,
                                  width: `${taskPos.width}%`,
                                }}
                                onClick={() => handleEditTask(task)}
                              >
                                <BarFill
                                  colorClass={getTaskColor(task)}
                                  continuesAfter={taskPos.continuesAfter}
                                />
                              </div>
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
