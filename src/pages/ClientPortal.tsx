import { useState } from "react";
import {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  normalizeTaskStatus,
  normalizeTaskPriority,
  normalizeProjectStatus,
  getTaskStatusLabel,
  getProjectStatusLabel,
} from "@/constants";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  User,
  CalendarDays,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface TaskComment {
  id: string;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  createdAt: string;
}

interface PortalTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { fullName: string | null; email: string } | null;
  dueDate: string | null;
  comments?: TaskComment[];
}

interface PortalPhase {
  id: string;
  name: string;
  status: string | null;
  tasks: PortalTask[];
}

interface ShareInfo {
  clientEmail: string | null;
  clientName: string | null;
}

interface PortalData {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  phases: PortalPhase[];
  permissions: string[];
  share: ShareInfo;
}

// Claves canónicas. Este mapa lo comparten estados de tarea (TODO, IN_PROGRESS,
// ON_HOLD, COMPLETED) y de proyecto (NOT_STARTED, ARCHIVED), que es como se usa
// más abajo: mismo color para el mismo significado.
const statusColors: Record<string, string> = {
  [TaskStatus.TODO]: "bg-slate-100 text-slate-700",
  [ProjectStatus.NOT_STARTED]: "bg-slate-100 text-slate-700",
  [TaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-700",
  [TaskStatus.COMPLETED]: "bg-emerald-100 text-emerald-700",
  [TaskStatus.ON_HOLD]: "bg-amber-100 text-amber-700",
  [ProjectStatus.ARCHIVED]: "bg-slate-100 text-slate-500",
};

/** Color por estado, tolerante con las grafías históricas. */
function statusClass(status: string | null | undefined): string {
  const canonical = normalizeTaskStatus(status) ?? normalizeProjectStatus(status);
  return (canonical && statusColors[canonical]) || "";
}

// "Critical" no existía en el catálogo: la prioridad máxima es URGENT.
const priorityColors: Record<string, string> = {
  [TaskPriority.LOW]: "bg-slate-100 text-slate-600",
  [TaskPriority.MEDIUM]: "bg-blue-100 text-blue-600",
  [TaskPriority.HIGH]: "bg-amber-100 text-amber-700",
  [TaskPriority.URGENT]: "bg-red-100 text-red-700",
};

/** Color por prioridad, tolerante con las grafías históricas. */
function priorityClass(priority: string | null | undefined): string {
  const canonical = normalizeTaskPriority(priority);
  return (canonical && priorityColors[canonical]) || "";
}

const ClientPortal = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<PortalTask | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestEmailSaved, setGuestEmailSaved] = useState(false);

  const {
    data: portalData,
    isLoading,
    isError,
  } = useQuery<PortalData>({
    queryKey: ["portal", shareToken],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/portal/${shareToken}`);
      return data;
    },
    enabled: !!shareToken,
    retry: false,
  });

  const canComment = portalData?.permissions?.includes("comment") ?? false;
  const clientName = portalData?.share?.clientName;
  const clientEmail = portalData?.share?.clientEmail;
  const needsEmail = !clientEmail && !guestEmailSaved;

  const handleSaveGuestEmail = () => {
    if (!guestEmail.trim()) return;
    setGuestEmailSaved(true);
  };

  const handleSubmitComment = async () => {
    if (!comment.trim() || !selectedTask) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/portal/${shareToken}/tasks/${selectedTask.id}/comments`,
        {
          content: comment,
          authorEmail: clientEmail || guestEmail || undefined,
          authorName: clientName || undefined,
        }
      );
      toast({ title: "Comment submitted" });
      setComment("");
      // Refresh portal data to show new comment
      queryClient.invalidateQueries({ queryKey: ["portal", shareToken] });
      // Update selected task comments locally for immediate feedback
      if (selectedTask) {
        const newComment: TaskComment = {
          id: crypto.randomUUID(),
          content: comment,
          authorName: clientName || null,
          authorEmail: clientEmail || guestEmail || null,
          createdAt: new Date().toISOString(),
        };
        setSelectedTask({
          ...selectedTask,
          comments: [...(selectedTask.comments || []), newComment],
        });
      }
    } catch (err: any) {
      toast({
        title: "Error submitting comment",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError || !portalData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link Invalid or Expired</h1>
          <p className="text-muted-foreground">
            This project share link is no longer valid. Please contact the
            project owner for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { project, phases } = portalData;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/d3c178bd-e905-4e9f-aea6-25fff0b49ef5.png"
              alt="Domotai"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-semibold">Domotai</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Client Portal
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome message */}
        {clientName && (
          <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-800">
              Welcome, <span className="font-semibold">{clientName}</span>!
            </p>
          </div>
        )}

        {/* Guest email prompt */}
        {needsEmail && (
          <div className="mb-6 rounded-md border bg-white p-4 max-w-md">
            <Label htmlFor="guestEmail" className="text-sm font-medium mb-2 block">
              Please enter your email to continue
            </Label>
            <div className="flex gap-2">
              <Input
                id="guestEmail"
                type="email"
                placeholder="your@email.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveGuestEmail()}
              />
              <Button onClick={handleSaveGuestEmail} size="sm" disabled={!guestEmail.trim()}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Project Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {project.status && (
              <Badge
                variant="secondary"
                className={cn(statusClass(project.status))}
              >
                {getProjectStatusLabel(project.status)}
              </Badge>
            )}
            {project.startDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Start:{" "}
                {new Date(project.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {project.endDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                End:{" "}
                {new Date(project.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Kanban-style phases */}
        {phases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No phases to display yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {phases.map((phase) => (
              <div key={phase.id} className="flex flex-col">
                <div className="bg-slate-100 rounded-t-lg px-4 py-3 border border-b-0 border-slate-200">
                  <h3 className="font-semibold text-sm">{phase.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phase.tasks.length} task
                    {phase.tasks.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="border border-slate-200 rounded-b-lg bg-white p-2 space-y-2 min-h-[120px]">
                  {phase.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        selectedTask?.id === task.id && "ring-2 ring-blue-500"
                      )}
                      onClick={() => setSelectedTask(task)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <p className="font-medium text-sm leading-tight">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              statusClass(task.status)
                            )}
                          >
                            {getTaskStatusLabel(task.status)}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              priorityClass(task.priority)
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>
                              {task.assignee.fullName || task.assignee.email}
                            </span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        )}
                        {task.comments && task.comments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            <span>
                              {task.comments.length} comment
                              {task.comments.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {phase.tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No tasks
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task detail panel with comments */}
        {selectedTask && (
          <Card className="mt-8 max-w-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{selectedTask.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSelectedTask(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {selectedTask.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTask.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", statusClass(selectedTask.status))}
                >
                  {selectedTask.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", priorityClass(selectedTask.priority))}
                >
                  {selectedTask.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing comments */}
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({selectedTask.comments.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedTask.comments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-md border bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs">
                            {c.authorName || c.authorEmail || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment form */}
              {canComment && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-medium">Add a comment</Label>
                  <Textarea
                    placeholder="Write your comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submitting || !comment.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? "Submitting..." : "Submit Comment"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-muted-foreground">
          Powered by Domotai
        </div>
      </footer>
    </div>
  );
};

export default ClientPortal;
