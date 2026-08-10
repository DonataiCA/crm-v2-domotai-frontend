import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { timeEntryService } from "@/services/time-entry.service";
import { projectService } from "@/services/project.service";
import { exportService } from "@/services/export.service";
import type { TimeEntry, Project, ProjectTask } from "@/types/api";
import {
  Clock,
  DollarSign,
  Timer,
  Plus,
  Play,
  Square,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Hourglass,
} from "lucide-react";

const ITEMS_PER_PAGE = 15;

function formatDuration(minutes: number | null): string {
  if (!minutes) return "0h 0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formats elapsed seconds as hh:mm:ss */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Active Timer Banner ────────────────────────────────────────────────────

function ActiveTimerBanner({
  entry,
  onStop,
}: {
  entry: TimeEntry;
  onStop: (id: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startMs = new Date(entry.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [entry.startTime]);

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardContent className="flex items-center justify-between pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Timer Running</p>
            <p className="text-2xl font-bold tabular-nums text-blue-700">
              {formatElapsed(elapsed)}
            </p>
          </div>
          <div className="ml-4 text-sm text-blue-700">
            {entry.project?.name && (
              <span className="font-medium">{entry.project.name}</span>
            )}
            {entry.description && (
              <span className="ml-2 text-blue-600">— {entry.description}</span>
            )}
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onStop(entry.id)}
        >
          <Square className="h-4 w-4 mr-2" />
          Stop
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Time Entry Form Dialog ─────────────────────────────────────────────────

interface TimeEntryFormProps {
  projects: Project[];
  onSuccess: () => void;
  editEntry?: TimeEntry | null;
}

function TimeEntryForm({ projects, onSuccess, editEntry }: TimeEntryFormProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(editEntry?.projectId || "");
  const [projectTaskId, setProjectTaskId] = useState(editEntry?.projectTaskId || "");
  const [description, setDescription] = useState(editEntry?.description || "");
  const [startTime, setStartTime] = useState(
    editEntry?.startTime
      ? new Date(editEntry.startTime).toISOString().slice(0, 16)
      : ""
  );
  const [endTime, setEndTime] = useState(
    editEntry?.endTime
      ? new Date(editEntry.endTime).toISOString().slice(0, 16)
      : ""
  );
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [useDuration, setUseDuration] = useState(false);
  const [billable, setBillable] = useState(editEntry?.billable ?? true);
  const [hourlyRate, setHourlyRate] = useState(
    editEntry?.hourlyRate?.toString() || ""
  );
  const [saving, setSaving] = useState(false);

  // Fetch tasks for selected project
  const { data: projectData } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  });

  const tasks: ProjectTask[] = projectData?.phases?.flatMap((p) => p.tasks) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        projectId: projectId || null,
        projectTaskId: projectTaskId || null,
        description: description || null,
        billable,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      };

      if (useDuration) {
        const totalMins =
          (parseInt(durationHours || "0") || 0) * 60 +
          (parseInt(durationMinutes || "0") || 0);
        payload.durationMinutes = totalMins;
        // If no startTime supplied, default to now minus duration
        if (!startTime) {
          const now = new Date();
          payload.endTime = now.toISOString();
          payload.startTime = new Date(now.getTime() - totalMins * 60000).toISOString();
        } else {
          payload.startTime = new Date(startTime).toISOString();
          payload.endTime = new Date(
            new Date(startTime).getTime() + totalMins * 60000
          ).toISOString();
        }
      } else {
        if (!startTime || !endTime) {
          toast({
            title: "Validation Error",
            description: "Please provide both start and end times.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        payload.startTime = new Date(startTime).toISOString();
        payload.endTime = new Date(endTime).toISOString();
      }

      if (editEntry) {
        await timeEntryService.updateTimeEntry(editEntry.id, payload);
        toast({ title: "Time entry updated" });
      } else {
        await timeEntryService.createTimeEntry(payload);
        toast({ title: "Time entry logged" });
      }
      onSuccess();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save time entry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Project */}
      <div className="space-y-2">
        <Label>Project</Label>
        <Select value={projectId} onValueChange={(v) => { setProjectId(v); setProjectTaskId(""); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task */}
      {projectId && tasks.length > 0 && (
        <div className="space-y-2">
          <Label>Task</Label>
          <Select value={projectTaskId} onValueChange={setProjectTaskId}>
            <SelectTrigger>
              <SelectValue placeholder="Select task (optional)" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What were you working on?"
          rows={2}
        />
      </div>

      {/* Duration toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={useDuration} onCheckedChange={setUseDuration} />
        <Label className="cursor-pointer">Enter duration instead of start/end</Label>
      </div>

      {useDuration ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hours</Label>
            <Input
              type="number"
              min="0"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Minutes</Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Billable + Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={billable} onCheckedChange={setBillable} />
          <Label className="cursor-pointer">Billable</Label>
        </div>
        <div className="space-y-2">
          <Label>Hourly Rate ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving..." : editEntry ? "Update Entry" : "Log Time"}
      </Button>
    </form>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

const TimeTracking = () => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch time entries
  const { data: entriesResponse, isLoading, error } = useQuery({
    queryKey: ["time-entries", currentOrganization?.id, currentPage],
    queryFn: () => timeEntryService.getTimeEntries(currentPage, ITEMS_PER_PAGE),
    enabled: !!currentOrganization,
  });

  // Fetch all entries for stats (first page with large limit)
  const { data: allEntriesResponse } = useQuery({
    queryKey: ["time-entries-stats", currentOrganization?.id],
    queryFn: () => timeEntryService.getTimeEntries(1, 500),
    enabled: !!currentOrganization,
  });

  // Fetch projects for selectors
  const { data: projectsResponse } = useQuery({
    queryKey: ["projects-list", currentOrganization?.id],
    queryFn: () => projectService.getProjects(1, 200),
    enabled: !!currentOrganization,
  });

  const entries = entriesResponse?.data || [];
  const pagination = entriesResponse?.pagination;
  const totalPages = pagination?.pages || 1;
  const projects = projectsResponse?.data || [];
  const allEntries = allEntriesResponse?.data || [];

  // Find any running timer (no endTime)
  const activeTimer = allEntries.find((e) => !e.endTime);

  // Stats: this week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekEntries = allEntries.filter(
    (e) => new Date(e.startTime) >= startOfWeek && e.endTime
  );
  const totalMinutesThisWeek = weekEntries.reduce(
    (sum, e) => sum + (e.durationMinutes || 0),
    0
  );
  const billableMinutesThisWeek = weekEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const totalValueThisWeek = weekEntries
    .filter((e) => e.billable && e.hourlyRate)
    .reduce(
      (sum, e) => sum + ((e.durationMinutes || 0) / 60) * (e.hourlyRate || 0),
      0
    );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    queryClient.invalidateQueries({ queryKey: ["time-entries-stats"] });
  };

  const handleStopTimer = async (id: string) => {
    try {
      await timeEntryService.stopTimer(id);
      toast({ title: "Timer stopped" });
      invalidate();
    } catch {
      toast({
        title: "Error",
        description: "Failed to stop timer.",
        variant: "destructive",
      });
    }
  };

  const handleStartTimer = async () => {
    try {
      await timeEntryService.startTimer({});
      toast({ title: "Timer started" });
      invalidate();
    } catch {
      toast({
        title: "Error",
        description: "Failed to start timer.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await timeEntryService.deleteTimeEntry(id);
      toast({ title: "Time entry deleted" });
      invalidate();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete entry.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      await exportService.exportTimeEntriesCSV();
    } catch {
      toast({
        title: "Export failed",
        description: "Could not export time entries.",
        variant: "destructive",
      });
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Organization Selected</h2>
        <p className="text-muted-foreground">
          Please select an organization to view time tracking.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleStartTimer}>
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
          <Dialog
            open={logDialogOpen}
            onOpenChange={(open) => {
              setLogDialogOpen(open);
              if (!open) setEditEntry(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editEntry ? "Edit Time Entry" : "Log Time"}
                </DialogTitle>
                <DialogDescription>
                  {editEntry
                    ? "Update the time entry details below."
                    : "Record time spent on a project or task."}
                </DialogDescription>
              </DialogHeader>
              <TimeEntryForm
                projects={projects}
                editEntry={editEntry}
                onSuccess={() => {
                  setLogDialogOpen(false);
                  setEditEntry(null);
                  invalidate();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Timer */}
      {activeTimer && (
        <ActiveTimerBanner entry={activeTimer} onStop={handleStopTimer} />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Total Hours (this week)
              </p>
              <p className="text-2xl font-bold">
                {formatDuration(totalMinutesThisWeek)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billable Hours</p>
              <p className="text-2xl font-bold">
                {formatDuration(billableMinutesThisWeek)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                ${totalValueThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
          <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button onClick={() => queryClient.invalidateQueries()}>Retry</Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No Time Entries</h3>
          <p className="text-muted-foreground">
            Start a timer or log time to see entries here.
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="hidden md:table-cell">User</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(entry.startTime)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(entry.startTime)}
                      {entry.endTime && ` - ${formatTime(entry.endTime)}`}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.endTime
                      ? formatDuration(entry.durationMinutes)
                      : (
                        <Badge variant="secondary" className="animate-pulse">
                          Running
                        </Badge>
                      )}
                  </TableCell>
                  <TableCell>{entry.project?.name || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {entry.user?.fullName || entry.user?.email || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                    {entry.description || "—"}
                  </TableCell>
                  <TableCell>
                    {entry.billable ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Billable
                      </Badge>
                    ) : (
                      <Badge variant="outline">Non-billable</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditEntry(entry);
                          setLogDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
            {pagination && ` (${pagination.total} entries)`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeTracking;
