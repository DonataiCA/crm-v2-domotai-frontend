import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api-client";
import {
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle,
  Pencil,
  Layers,
  Calendar,
  Flag,
} from "lucide-react";
import type { ProjectTask } from "@/types/api";

type TaskWithPhase = ProjectTask & { phase?: { id: string; name: string } | null };

interface ChatResult {
  action: "create" | "update";
  task: TaskWithPhase;
  aiInterpretation?: { workArea: string | null; assignee: string | null };
  changes?: Record<string, unknown>;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: ChatResult[];
  createdCount?: number;
  updatedCount?: number;
}

interface TaskChatProps {
  projectId: string;
  onTaskCreated: () => void;
}

export const TaskChat = ({ projectId, onTaskCreated }: TaskChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        'Describe lo que necesitas en lenguaje natural. Puedo:\n\n• **Crear tareas**: "Crear endpoint de login con JWT y bcrypt"\n• **Asignar**: "Asigna las tareas en TODO a David Altuve"\n• **Cambiar prioridad**: "Sube a urgente la tarea de la API de pagos"\n• **Cambiar estado**: "Marca como completada la tarea de diseño del dashboard"\n• **Mover de fase**: "Mueve la tarea de tests al área de QA"',
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSummaryHeader = (createdCount: number, updatedCount: number): string => {
    const parts: string[] = [];
    if (createdCount > 0) parts.push(`${createdCount} ${createdCount === 1 ? "tarea creada" : "tareas creadas"}`);
    if (updatedCount > 0) parts.push(`${updatedCount} ${updatedCount === 1 ? "tarea actualizada" : "tareas actualizadas"}`);
    return parts.length > 0 ? parts.join(" · ") : "Sin cambios";
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data } = await api.post(`/projects/${projectId}/chat-task`, {
        message: text,
      });

      // New shape: { results, createdCount, updatedCount, count }
      // Legacy shape: { task, tasks, count } — synthesize results from it
      let results: ChatResult[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      if (Array.isArray(data.results)) {
        results = data.results;
        createdCount = data.createdCount ?? results.filter((r: ChatResult) => r.action === "create").length;
        updatedCount = data.updatedCount ?? results.filter((r: ChatResult) => r.action === "update").length;
      } else if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        results = data.tasks.map((t: any) => ({
          action: "create" as const,
          task: t.task,
          aiInterpretation: t.aiInterpretation,
          summary: `Created "${t.task?.title}"`,
        }));
        createdCount = results.length;
      }

      const headerText = results.length === 0
        ? "No identifiqué ninguna tarea para crear ni actualizar. Reformula tu petición."
        : buildSummaryHeader(createdCount, updatedCount);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: headerText,
        results: results.length > 0 ? results : undefined,
        createdCount,
        updatedCount,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (results.length > 0) onTaskCreated();
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.error || (error instanceof Error ? error.message : "Falló el procesamiento");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${errMsg}. Reformula tu petición.`,
        },
      ]);
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-yellow-500 text-white";
      default:
        return "bg-green-500 text-white";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.results ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {msg.content}
                  </div>
                  {msg.results.map((r, idx) => {
                    const isUpdate = r.action === "update";
                    return (
                      <div
                        key={idx}
                        className={`space-y-1.5 ${idx > 0 ? "border-t pt-2" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isUpdate ? (
                            <Pencil className="h-3 w-3 text-blue-600" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {isUpdate ? "Actualizada" : "Creada"}
                          </span>
                        </div>
                        <div className="font-medium text-sm">{r.task?.title}</div>
                        {!isUpdate && r.task?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {r.task.description}
                          </p>
                        )}
                        {isUpdate && r.changes && (
                          <p className="text-xs text-muted-foreground italic">
                            {r.summary.replace(/^"[^"]+"\s*—\s*/, "")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {r.task?.phase && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Layers className="h-2.5 w-2.5" />
                              {r.task.phase.name}
                            </Badge>
                          )}
                          {r.task?.priority && (
                            <Badge
                              className={`text-xs ${getPriorityColor(r.task.priority)}`}
                            >
                              <Flag className="h-2.5 w-2.5 mr-0.5" />
                              {r.task.priority}
                            </Badge>
                          )}
                          {(r.aiInterpretation?.assignee || (r.task as any)?.assignee?.fullName) && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <User className="h-2.5 w-2.5" />
                              {r.aiInterpretation?.assignee || (r.task as any)?.assignee?.fullName}
                            </Badge>
                          )}
                          {r.task?.dueDate && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(r.task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="whitespace-pre-line">{msg.content}</p>
              )}
            </div>

            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-lg px-3.5 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Crear, asignar, cambiar prioridad..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={isLoading}
          className="h-9"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="sm"
          className="h-9 px-3"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
