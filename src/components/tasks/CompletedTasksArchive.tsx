import { useState, useMemo } from "react";
import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, User2, CheckCircle2 } from "lucide-react";
import { getPriorityBgColor } from "@/constants";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import type { Task } from "@/types/api";

type Period = "2w" | "1m" | "3m" | "all";

interface CompletedTasksArchiveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  userRole?: string | null;
}

const PERIOD_LABELS: Record<Period, string> = {
  "2w": "Last 2 weeks",
  "1m": "This month",
  "3m": "Last 3 months",
  "all": "All time",
};

function getCutoff(period: Period): Date | null {
  const now = new Date();
  if (period === "2w") return subDays(now, 14);
  if (period === "1m") return startOfMonth(now);
  if (period === "3m") return subMonths(now, 3);
  return null;
}

function groupByMonth(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const dateStr = t.updatedAt || t.createdAt;
    const key = dateStr ? format(parseISO(dateStr), "MMMM yyyy") : "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).map(([label, tasks]) => ({ label, tasks }));
}

export function CompletedTasksArchive({
  open,
  onOpenChange,
  tasks,
  userRole,
}: CompletedTasksArchiveProps) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("2w");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const completed = useMemo(() => tasks.filter((t) => t.status === "COMPLETED"), [tasks]);

  const filtered = useMemo(() => {
    const cutoff = getCutoff(period);
    const q = search.toLowerCase();
    return completed.filter((t) => {
      if (cutoff && t.updatedAt && parseISO(t.updatedAt) < cutoff) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [completed, period, search]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Completed Tasks Archive
              <Badge variant="secondary" className="ml-1">{completed.length}</Badge>
            </SheetTitle>

            <div className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search completed tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList className="w-full">
                  {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                    <TabsTrigger key={p} value={p} className="flex-1 text-xs">
                      {PERIOD_LABELS[p]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No completed tasks in this period</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {group.label}
                      <span className="ml-2 font-normal normal-case">({group.tasks.length})</span>
                    </p>
                    <div className="space-y-2">
                      {group.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="border rounded-lg p-3 bg-background hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
                            <Badge
                              variant="secondary"
                              className={`text-xs text-white shrink-0 ${getPriorityBgColor(task.priority)}`}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {task.assignee && (
                              <span className="flex items-center text-xs text-muted-foreground">
                                <User2 className="h-3 w-3 mr-1" />
                                {task.assignee.fullName || task.assignee.email}
                              </span>
                            )}
                            {task.updatedAt && (
                              <span className="flex items-center text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                {format(parseISO(task.updatedAt), "MMM d, yyyy")}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                Due: {format(parseISO(task.dueDate), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TaskDetailsDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userRole={userRole}
      />
    </>
  );
}
